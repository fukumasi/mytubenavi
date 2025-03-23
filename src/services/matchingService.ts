// src/services/matchingService.ts

import { supabase } from '../lib/supabase';
import { 
  MatchingUser, 
  MatchingPreferences, 
  UserPoints, 
  Message, 
  Conversation,
  VideoDetails,
  SkippedUser 
} from '../types/matching';

// マッチングスコアを計算するための関数
export const calculateMatchingScore = (
  userInterests: string[],
  otherUserInterests: string[],
  userGenres: string[],
  otherUserGenres: string[],
  userVideos: string[],
  otherUserVideos: string[],
  userActivity: number,
  otherUserActivity: number,
  isPremium: boolean,
  otherIsPremium: boolean
): number => {
  // 共通の興味を計算
  const commonInterests = userInterests.filter(interest => 
    otherUserInterests.includes(interest)
  );
  
  // 共通のジャンルを計算
  const commonGenres = userGenres.filter(genre => 
    otherUserGenres.includes(genre)
  );
  
  // 共通の視聴動画を計算
  const commonVideos = userVideos.filter(video =>
    otherUserVideos.includes(video)
  );
  
  // 興味のスコア (最大30点)
  const interestScore = Math.min(
    (commonInterests.length / Math.max(userInterests.length, 1)) * 30,
    30
  );
  
  // ジャンルのスコア (最大25点)
  const genreScore = Math.min(
    (commonGenres.length / Math.max(userGenres.length, 1)) * 25,
    25
  );
  
  // 視聴動画の共通性スコア (最大20点)
  const videoScore = Math.min(
    (commonVideos.length / Math.min(10, Math.max(userVideos.length, 1))) * 20,
    20
  );
  
  // 活動レベルの類似性スコア (最大15点)
  // 活動レベルの差が小さいほど高スコア
  const activityDifference = Math.abs(userActivity - otherUserActivity);
  const activityScore = Math.max(15 - (activityDifference * 3), 0);
  
  // プレミアムボーナス (最大10点)
  const premiumBonus = isPremium && otherIsPremium ? 10 : 0;
  
  // 合計スコア (最大100点)
  return Math.round(interestScore + genreScore + videoScore + activityScore + premiumBonus);
};

// ユーザーの活動レベルを計算する関数
export const calculateActivityLevel = async (userId: string): Promise<number> => {
  try {
    // 過去30日間のログイン回数を取得
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: loginCount, error: loginError } = await supabase
      .from('user_logins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('login_time', thirtyDaysAgo.toISOString());
      
    if (loginError) throw loginError;
    
    // コメント数を取得
    const { count: commentCount, error: commentError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());
      
    if (commentError) throw commentError;
    
    // 評価数を取得
    const { count: ratingCount, error: ratingError } = await supabase
      .from('video_ratings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());
      
    if (ratingError) throw ratingError;
    
    // メッセージ数を取得
    const { count: messageCount, error: messageError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());
      
    if (messageError) throw messageError;
    
    // 活動レベルを計算 (1-10のスケール)
    // ログイン: 最大3点、コメント: 最大2点、評価: 最大2点、メッセージ: 最大3点
    const loginScore = Math.min((loginCount || 0) / 10, 1) * 3;
    const commentScore = Math.min((commentCount || 0) / 5, 1) * 2;
    const ratingScore = Math.min((ratingCount || 0) / 5, 1) * 2;
    const messageScore = Math.min((messageCount || 0) / 10, 1) * 3;
    
    return Math.round(loginScore + commentScore + ratingScore + messageScore);
    
  } catch (error) {
    console.error('活動レベル計算エラー:', error);
    return 5; // エラー時はデフォルト値を返す
  }
};

// ユーザーの視聴履歴を取得する関数
export const getUserWatchHistory = async (userId: string, limit: number = 20): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('view_history')
      .select('video_id')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    return data?.map(item => item.video_id) || [];
    
  } catch (error) {
    console.error('視聴履歴取得エラー:', error);
    return [];
  }
};

// マッチング候補を取得する関数
export const fetchMatchCandidates = async (userId: string, preferences: MatchingPreferences) => {
  try {
    // 現在のユーザーの情報を取得
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('interests, genre_preference, is_premium')
      .eq('id', userId)
      .single();
      
    if (userError) throw userError;
    
    // 現在のユーザーの活動レベルを取得
    const userActivityLevel = await calculateActivityLevel(userId);
    
    // 現在のユーザーの視聴履歴を取得
    const userWatchHistory = await getUserWatchHistory(userId, 50);
    
    // 既にスキップまたはいいねしたユーザーを取得
    const { data: skippedData } = await supabase
      .from('user_skips')
      .select('skipped_user_id')
      .eq('user_id', userId);
      
    const { data: likedData } = await supabase
      .from('user_likes')
      .select('liked_user_id')
      .eq('user_id', userId);
      
    // 除外するユーザーIDのリスト
    const skippedIds = skippedData?.map(s => s.skipped_user_id) || [];
    const likedIds = likedData?.map(l => l.liked_user_id) || [];
    
    let excludedIds = [userId]; // 自分自身は必ず除外
    
    // スキップしたユーザーを除外するフラグがオンの場合のみスキップユーザーを除外
    if (preferences.filter_skipped) {
      excludedIds = [...excludedIds, ...skippedIds];
    }
    
    // いいねしたユーザーは常に除外
    excludedIds = [...excludedIds, ...likedIds];
    
    // 除外リストが空でない場合のクエリ構築
    let excludeCondition = '';
    if (excludedIds.length > 0) {
      excludeCondition = `(${excludedIds.join(',')})`;
    } else {
      excludeCondition = `(${userId})`;  // 少なくとも自分自身は除外
    }
    
    // マッチング候補を取得するクエリを構築
    let query = supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, interests, genre_preference, is_premium, gender, birth_date, location, online_status, last_active')
      .not('id', 'in', excludeCondition)
      .eq('matching_enabled', true)  // マッチングが有効なユーザーのみ
      .limit(20);
      
    // フィルタリング条件を追加
    if (preferences.gender_preference && preferences.gender_preference !== 'any') {
      query = query.eq('gender', preferences.gender_preference);
    }
    
    if (preferences.location_preference && preferences.location_preference.prefecture) {
      query = query.contains('location', { prefecture: preferences.location_preference.prefecture });
    }
    
    // 年齢範囲でフィルタリング
    if (preferences.age_range_min && preferences.age_range_max) {
      const maxBirthDate = new Date();
      maxBirthDate.setFullYear(maxBirthDate.getFullYear() - preferences.age_range_min);
      
      const minBirthDate = new Date();
      minBirthDate.setFullYear(minBirthDate.getFullYear() - preferences.age_range_max);
      
      query = query.lte('birth_date', maxBirthDate.toISOString());
      query = query.gte('birth_date', minBirthDate.toISOString());
    }
    
    // オンラインユーザーのみ表示設定
    if (preferences.online_only) {
      query = query.eq('online_status', 'online');
    }
    
    // プレミアムユーザーのみ表示設定
    if (preferences.premium_only) {
      query = query.eq('is_premium', true);
    }
    
    // 視聴履歴があるユーザーのみフィルタリング（新機能）
    if (preferences.has_video_history) {
      // 視聴履歴が1件以上あるユーザーを取得するサブクエリ
      const { data: usersWithHistory } = await supabase
        .from('view_history')
        .select('user_id')
        .gt('view_count', 0)
        .limit(1000);
      
      if (usersWithHistory && usersWithHistory.length > 0) {
        const userIdsWithHistory = usersWithHistory.map(u => u.user_id);
        query = query.in('id', userIdsWithHistory);
      }
    }
    
    // 最近活動したユーザーのみフィルタリング（新機能）
    if (preferences.recent_activity) {
      // 一週間以内にログインしたユーザーのみ
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      query = query.gte('last_active', oneWeekAgo.toISOString());
    }
    
    // 活動レベルでフィルタリング（プレミアムユーザーのみ）
    if (userData?.is_premium && preferences.activity_level) {
      // この処理は後で実装する（活動レベルごとにスコアでフィルタリング）
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // 各ユーザーの活動レベルと視聴履歴を取得
    const candidatesWithDetails = await Promise.all(data.map(async (candidate) => {
      try {
        const activityLevel = await calculateActivityLevel(candidate.id);
        const watchHistory = await getUserWatchHistory(candidate.id, 50);
        
        return {
          ...candidate,
          activity_level: activityLevel,
          watch_history: watchHistory
        };
      } catch (error) {
        console.error(`ユーザー${candidate.id}の詳細取得エラー:`, error);
        return {
          ...candidate,
          activity_level: 5,  // デフォルト値
          watch_history: []
        };
      }
    }));
    
    // マッチングスコアを計算して候補を整形
    const candidates = candidatesWithDetails.map(candidate => {
      const candidateInterests = candidate.interests || [];
      const userInterests = userData?.interests || [];
      
      const candidateGenres = candidate.genre_preference || [];
      const userGenres = userData?.genre_preference || [];
      
      const score = calculateMatchingScore(
        userInterests,
        candidateInterests,
        userGenres,
        candidateGenres,
        userWatchHistory,
        candidate.watch_history || [],
        userActivityLevel,
        candidate.activity_level || 5,
        userData?.is_premium || false,
        candidate.is_premium || false
      );
      
      // 年齢を計算（birth_dateがある場合）
      let age: number | null = null;
      if (candidate.birth_date) {
        const birthDate = new Date(candidate.birth_date);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
      
      // 共通の興味を抽出
      const commonInterests = userInterests.filter((i: string) => 
        candidateInterests.includes(i)
      );
      
      // 共通のジャンルを抽出
      const commonGenres = userGenres.filter((g: string) => 
        candidateGenres.includes(g)
      );
      
      // 共通の視聴動画を抽出
      const commonVideos = userWatchHistory.filter(v => 
        (candidate.watch_history || []).includes(v)
      );
      
      return {
        id: candidate.id,
        username: candidate.username,
        avatar_url: candidate.avatar_url,
        bio: candidate.bio || '',
        interests: candidateInterests,
        matching_score: score,
        common_interests: commonInterests,
        common_genres: commonGenres,
        common_videos_count: commonVideos.length,
        is_premium: candidate.is_premium || false,
        gender: candidate.gender || '',
        age,
        location: candidate.location || null,
        activity_level: candidate.activity_level || 5,
        online_status: candidate.online_status || 'offline',
        last_active: candidate.last_active || null,
        connection_status: 'none'
      } as MatchingUser;
    });
    
    // マッチングスコアでソート
    return candidates.sort((a, b) => b.matching_score - a.matching_score);
    
  } catch (error) {
    console.error('マッチング候補の取得エラー:', error);
    throw error;
  }
};

// ユーザーのポイント残高を取得
export const getUserPoints = async (userId: string): Promise<UserPoints> => {
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('balance, lifetime_earned, last_updated')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが存在しない場合は新規作成
        const { data: newData, error: insertError } = await supabase
          .from('user_points')
          .insert({
            user_id: userId,
            balance: 10, // 初期ポイント
            lifetime_earned: 10
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        return newData as UserPoints;
      } else {
        throw error;
      }
    }
    
    return data as UserPoints;
    
  } catch (error) {
    console.error('ポイント取得エラー:', error);
    // デフォルト値を返す
    return {
      balance: 0,
      lifetime_earned: 0,
      last_updated: new Date().toISOString()
    };
  }
};

// ポイントを消費する
export const consumePoints = async (
  userId: string,
  amount: number,
  transactionType: string,
  referenceId?: string
): Promise<boolean> => {
  try {
    // ポイント残高を確認
    const userPoints = await getUserPoints(userId);
    
    if (userPoints.balance < amount) {
      throw new Error('ポイント残高が不足しています');
    }
    
    // トランザクション開始
    const { error } = await supabase.rpc('consume_points', {
      p_user_id: userId,
      p_amount: amount
    });
    
    if (error) throw error;
    
    // トランザクション記録
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount: -amount,
        transaction_type: transactionType,
        reference_id: referenceId,
        description: `${transactionType}のためのポイント消費`
      });
      
    if (transactionError) throw transactionError;
    
    return true;
    
  } catch (error) {
    console.error('ポイント消費エラー:', error);
    return false;
  }
};

// ポイントを加算する
export const addPoints = async (
  userId: string,
  amount: number,
  transactionType: string,
  referenceId?: string,
  description?: string
): Promise<boolean> => {
  try {
    // トランザクション開始
    const { error } = await supabase.rpc('add_points', {
      p_user_id: userId,
      p_amount: amount
    });
    
    if (error) throw error;
    
    // トランザクション記録
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: transactionType,
        reference_id: referenceId,
        description: description || `${transactionType}からのポイント追加`
      });
      
    if (transactionError) throw transactionError;
    
    return true;
    
  } catch (error) {
    console.error('ポイント加算エラー:', error);
    return false;
  }
};

// いいねを送信する
export const sendLike = async (
  userId: string,
  targetUserId: string,
  isPremium: boolean
): Promise<{ success: boolean; isMatch: boolean; conversationId?: string; error?: string }> => {
  try {
    // 既にいいねしているか確認
    const { data: existingLike, error: checkError } = await supabase
      .from('user_likes')
      .select()
      .eq('user_id', userId)
      .eq('liked_user_id', targetUserId)
      .limit(1);
      
    if (checkError) throw checkError;
    
    if (existingLike && existingLike.length > 0) {
      return {
        success: true,
        isMatch: false,
        error: '既にいいねしています'
      };
    }
    
    // いいねを記録
    const { error } = await supabase
      .from('user_likes')
      .insert({
        user_id: userId,
        liked_user_id: targetUserId,
        created_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    // プレミアムでない場合はポイントを消費
    if (!isPremium) {
      const pointsConsumed = await consumePoints(userId, 5, 'like', targetUserId);
      if (!pointsConsumed) {
        // いいねの記録を削除（ロールバック）
        await supabase
          .from('user_likes')
          .delete()
          .eq('user_id', userId)
          .eq('liked_user_id', targetUserId);
          
        return {
          success: false,
          isMatch: false,
          error: 'ポイントが不足しています'
        };
      }
    }
    
    // 相手からのいいねがあるか確認（マッチング判定）
    const { data: matchData, error: matchError } = await supabase
      .from('user_likes')
      .select()
      .eq('user_id', targetUserId)
      .eq('liked_user_id', userId)
      .limit(1);
      
    if (matchError) throw matchError;
    
    // マッチングが成立した場合
    if (matchData && matchData.length > 0) {
      // マッチングテーブルに記録
      const { error: matchInsertError } = await supabase
        .from('user_matches')
        .insert({
          user1_id: userId,
          user2_id: targetUserId,
          created_at: new Date().toISOString()
        });
        
      if (matchInsertError) throw matchInsertError;
      
      // 既存の会話を確認
      const { data: existingConv, error: existingConvError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${userId})`)
        .limit(1);
        
      if (existingConvError) throw existingConvError;
      
      let conversationId;
      
      if (existingConv && existingConv.length > 0) {
        // 既存の会話がある場合は再アクティブ化
        conversationId = existingConv[0].id;
        await supabase
          .from('conversations')
          .update({
            is_active: true,
            last_message_time: new Date().toISOString()
          })
          .eq('id', conversationId);
      } else {
        // 会話テーブルを作成
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({
            user1_id: userId,
            user2_id: targetUserId,
            last_message_time: new Date().toISOString(),
            is_active: true,
            user1_unread_count: 0,
            user2_unread_count: 0
          })
          .select()
          .single();
          
        if (convError) throw convError;
        conversationId = convData.id;
      }
      
      // 通知を送信
      await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'match',
          title: 'マッチングが成立しました',
          message: 'あなたと相手がお互いにいいねしました。メッセージを送ってみましょう！',
          is_read: false,
          created_at: new Date().toISOString(),
          link: `/messages/${conversationId}`,
          priority: 'high',
          sender_id: userId,
          notification_group: 'matching'
        });
        
      // マッチしたことを通知する（ログイン報酬的な）ポイントを加算
      await addPoints(userId, 2, 'match_bonus', targetUserId, 'マッチング成立ボーナス');
      await addPoints(targetUserId, 2, 'match_bonus', userId, 'マッチング成立ボーナス');
        
      return { 
        success: true, 
        isMatch: true, 
        conversationId: conversationId 
      };
      
    } else {
      // マッチングが成立しなかった場合
      // 通知を送信（プレミアムユーザーのみ受信可能）
      const { data: targetUserData } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', targetUserId)
        .single();
        
      if (targetUserData?.is_premium) {
        await supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
            type: 'like',
            title: '新しいいいねがあります',
            message: '誰かがあなたにいいねしました。プロフィールをチェックしてみましょう！',
            is_read: false,
            created_at: new Date().toISOString(),
            link: '/matching',
            priority: 'medium',
            sender_id: userId,
            notification_group: 'matching'
          });
      }
      
      return { 
        success: true, 
        isMatch: false 
      };
    }
    
  } catch (error) {
    console.error('いいね送信エラー:', error);
    return { 
      success: false, 
      isMatch: false,
      error: error instanceof Error ? error.message : 'いいねの送信に失敗しました'
    };
  }
};

// ユーザーをスキップする
export const skipUser = async (userId: string, targetUserId: string): Promise<boolean> => {
  try {
    // 既にスキップしているか確認
    const { data: existingSkip, error: checkError } = await supabase
      .from('user_skips')
      .select()
      .eq('user_id', userId)
      .eq('skipped_user_id', targetUserId)
      .limit(1);
      
    if (checkError) throw checkError;
    
    if (existingSkip && existingSkip.length > 0) {
      return true; // 既にスキップ済み
    }
    
    const { error } = await supabase
      .from('user_skips')
      .insert({
        user_id: userId,
        skipped_user_id: targetUserId,
        created_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    return true;
    
  } catch (error) {
    console.error('スキップエラー:', error);
    return false;
  }
};

// スキップを取り消す
export const undoSkip = async (userId: string, targetUserId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_skips')
      .delete()
      .eq('user_id', userId)
      .eq('skipped_user_id', targetUserId);
      
    if (error) throw error;
    
    return true;
    
  } catch (error) {
    console.error('スキップ取り消しエラー:', error);
    return false;
  }
};

// スキップしたユーザーの一覧を取得する
export const getSkippedUsers = async (userId: string, limit: number = 10): Promise<SkippedUser[]> => {
  try {
    // スキップしたユーザーIDを取得
    const { data: skipData, error: skipError } = await supabase
      .from('user_skips')
      .select('skipped_user_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (skipError) throw skipError;
    
    if (!skipData || skipData.length === 0) {
      return [];
    }
    
    // スキップしたユーザーのIDリスト
    const skippedUserIds = skipData.map(skip => skip.skipped_user_id);
    
    // ユーザープロフィールの取得
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, interests, genre_preference, is_premium, gender, birth_date, location, online_status, last_active')
      .in('id', skippedUserIds);
      
    if (profileError) throw profileError;
    
    if (!profileData) {
      return [];
    }
    
    // スキップ日時とプロフィール情報を結合
    const skippedUsers = profileData.map(profile => {
      const skipInfo = skipData.find(skip => skip.skipped_user_id === profile.id);
      
      // 年齢を計算
      let age: number | null = null;
      if (profile.birth_date) {
        const birthDate = new Date(profile.birth_date);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
      
      return {
        ...profile,
        age,
        skipped_at: skipInfo?.created_at || new Date().toISOString(),
        interests: profile.interests || [],
        matching_score: 0, // スキップしたユーザーなのでスコアは表示しない
        common_interests: [],
        is_premium: profile.is_premium || false,
        gender: profile.gender || '',
        location: profile.location || null,
        connection_status: 'none',
      } as SkippedUser;
    });
    
    // スキップ日時の新しい順にソート
    return skippedUsers.sort((a, b) => {
      return new Date(b.skipped_at).getTime() - new Date(a.skipped_at).getTime();
    });
    
  } catch (error) {
    console.error('スキップユーザー取得エラー:', error);
    return [];
  }
};

// 会話を取得する
export const getConversation = async (
  conversationId: string,
  userId: string
): Promise<{ conversation: Conversation; otherUser: any } | null> => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
      
    if (error) throw error;
    
    if (!data) return null;
    
    // 自分が参加していない会話の場合はnullを返す
    if (data.user1_id !== userId && data.user2_id !== userId) {
      return null;
    }
    
    // 相手のユーザーIDを特定
    const otherUserId = data.user1_id === userId ? data.user2_id : data.user1_id;
    
    // 相手のプロフィール情報を取得
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_premium, last_active, online_status')
      .eq('id', otherUserId)
      .single();
      
    if (profileError) throw profileError;
    
    // 既読状態を更新
    const unreadField = data.user1_id === userId ? 'user1_unread_count' : 'user2_unread_count';
    await supabase
      .from('conversations')
      .update({ [unreadField]: 0 })
      .eq('id', conversationId);
      
    // メッセージの既読状態を更新
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false);
      
    return {
      conversation: data as Conversation,
      otherUser: profileData
    };
    
  } catch (error) {
    console.error('会話取得エラー:', error);
    return null;
  }
};

// メッセージを取得する
export const getMessages = async (conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw error;
    
    return (data || []).reverse() as Message[];
    
  } catch (error) {
    console.error('メッセージ取得エラー:', error);
    return [];
  }
};

// メッセージを送信する
export const sendMessage = async (
  userId: string,
  receiverId: string,
  conversationId: string,
  content: string,
  isHighlighted: boolean = false,
  isPremium: boolean = false
): Promise<{ success: boolean; message?: Message; error?: string }> => {
  try {
    // 内容が空でないか確認
    if (!content.trim()) {
      return {
        success: false,
        error: 'メッセージを入力してください'
      };
    }
    
    // 不適切な内容のフィルタリング（簡易版）
    const inappropriateWords = ['バカ', '死ね', 'クソ', '殺す']; // 実際はもっと広範囲で詳細なフィルターが必要
    const containsInappropriate = inappropriateWords.some(word => 
      content.toLowerCase().includes(word.toLowerCase())
    );
    
    if (containsInappropriate) {
      return {
        success: false,
        error: '不適切な表現が含まれています'
      };
    }
    
    // プレミアムでない場合はポイントを消費
    if (!isPremium) {
      const pointAmount = isHighlighted ? 10 : 1;
      const pointsConsumed = await consumePoints(userId, pointAmount, 'message', conversationId);
      
      if (!pointsConsumed) {
        return {
          success: false,
          error: 'ポイントが不足しています'
        };
      }
    }
    
    // メッセージを挿入
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        conversation_id: conversationId,
        content: content,
        is_highlighted: isHighlighted,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 会話の最終メッセージ時間とunread_countを更新
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (convError) throw convError;
    
    const unreadField = convData.user1_id === userId ? 'user2_unread_count' : 'user1_unread_count';
    await supabase
      .from('conversations')
      .update({ 
        last_message_time: new Date().toISOString(),
        [unreadField]: supabase.rpc('increment', { row_id: 1 }),
        is_active: true  // 会話を常にアクティブに
      })
      .eq('id', conversationId);
    
    // 相手のオンライン状態を確認
    const { data: receiverData } = await supabase
      .from('profiles')
      .select('online_status, is_premium')
      .eq('id', receiverId)
      .single();
    
    // オフラインまたはオンライン状態が不明の場合は通知を送信
    if (!receiverData || receiverData.online_status !== 'online') {
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          type: 'message',
          title: 'メッセージが届きました',
          message: `${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`,
          is_read: false,
          created_at: new Date().toISOString(),
          link: `/messages/${conversationId}`,
          priority: isHighlighted ? 'high' : 'medium',
          sender_id: userId,
          notification_group: 'messages'
        });
    }
    
    // メッセージ送信アクティビティでポイント付与 (プレミアム会員じゃない場合は5メッセージごとに1ポイント)
    if (!isPremium) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId);
        
      if (count && count % 5 === 0) {
        await addPoints(userId, 1, 'message_activity', conversationId, 'メッセージ活動ボーナス');
      }
    }
    
    return {
      success: true,
      message: data as Message
    };
    
  } catch (error) {
    console.error('メッセージ送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メッセージの送信に失敗しました'
    };
  }
};

// 会話リストを取得する
export const getConversations = async (userId: string, searchTerm?: string): Promise<any[]> => {
  try {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        last_message:messages(
          content, 
          created_at,
          sender_id,
          is_read
        )
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('is_active', true)  // アクティブな会話のみ
      .order('last_message_time', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // 会話ごとに相手のユーザー情報を取得して結合
    const conversationsWithProfiles = await Promise.all(data.map(async (conv) => {
      const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
      
      // 相手のプロフィール情報を取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_premium, online_status, last_active')
        .eq('id', otherUserId)
        .single();
        
      if (profileError) {
        console.error('プロフィール取得エラー:', profileError);
        return null;
      }
      
      // 検索条件に一致するか確認
      if (searchTerm && profileData.username.toLowerCase().indexOf(searchTerm.toLowerCase()) === -1) {
        return null;
      }
      
      // 最新のメッセージを取得
      let lastMessage = null;
      if (conv.last_message && conv.last_message.length > 0) {
        lastMessage = conv.last_message[0];
      } else {
        // 外部結合で最新メッセージを取得できなかった場合は別途取得
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, is_read')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (!messageError && messageData && messageData.length > 0) {
          lastMessage = messageData[0];
        }
      }
      
      // 未読メッセージ数
      const unreadCount = 
        conv.user1_id === userId 
          ? conv.user1_unread_count 
          : conv.user2_unread_count;
      
      // 会話の最終メッセージ時間が90日以上前なら非アクティブにする
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const lastMessageTime = new Date(conv.last_message_time);
      if (lastMessageTime < ninetyDaysAgo) {
        await supabase
          .from('conversations')
          .update({ is_active: false })
          .eq('id', conv.id);
        return null;  // 非アクティブになった会話は表示しない
      }
      
      return {
        ...conv,
        otherUser: profileData,
        last_message: lastMessage,
        unread_count: unreadCount || 0
      };
    }));
    
    // nullを除外し、最新のメッセージ順にソート
    return conversationsWithProfiles
      .filter(conv => conv !== null)
      .sort((a, b) => {
        const aTime = new Date(a.last_message_time).getTime();
        const bTime = new Date(b.last_message_time).getTime();
        return bTime - aTime;
      });
    
  } catch (error) {
    console.error('会話リスト取得エラー:', error);
    return [];
  }
};

// 会話を非アクティブ化する（削除に相当）
export const deactivateConversation = async (conversationId: string, userId: string): Promise<boolean> => {
  try {
    // 自分が参加者かどうか確認
    const { data, error } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();
    
    if (error) throw error;
    
    if (!data || (data.user1_id !== userId && data.user2_id !== userId)) {
      throw new Error('この会話を削除する権限がありません');
    }
    
    // 会話を非アクティブ化
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ is_active: false })
      .eq('id', conversationId);
    
    if (updateError) throw updateError;
    
    return true;
    
  } catch (error) {
    console.error('会話削除エラー:', error);
    return false;
  }
};

// マッチングプロフィールを取得する
export const getMatchingProfile = async (userId: string, targetUserId: string): Promise<{ profile: any; commonInterests: string[]; commonVideos: any[] } | null> => {
  try {
    // 自分のプロフィール情報を取得
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('interests, genre_preference, is_premium')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    // 相手のプロフィール情報を取得
    const { data: targetUserData, error: targetUserError } = await supabase
      .from('profiles')
      .select(`
        id, 
        username, 
        avatar_url, 
        bio, 
        interests, 
        genre_preference, 
        is_premium, 
        gender, 
        birth_date, 
        location,
        last_active,
        online_status
      `)
      .eq('id', targetUserId)
      .single();
    
    if (targetUserError) throw targetUserError;
    
    if (!targetUserData) return null;
    
    // 自分の視聴履歴を取得
    const userWatchHistory = await getUserWatchHistory(userId, 50);
    
    // 相手の視聴履歴を取得
    const targetUserWatchHistory = await getUserWatchHistory(targetUserId, 50);
    
    // 共通の興味を計算
    const userInterests = userData?.interests || [];
    const targetUserInterests = targetUserData.interests || [];
    const commonInterests = userInterests.filter((interest: string) => 
      targetUserInterests.includes(interest)
    );
    
    // 共通の視聴動画を計算
    const commonVideos = userWatchHistory.filter(video => 
      targetUserWatchHistory.includes(video)
    );
    
    // 年齢を計算
    let age: number | null = null;
    if (targetUserData.birth_date) {
      const birthDate = new Date(targetUserData.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
    
    // マッチングスコアを計算
    const userGenres = userData?.genre_preference || [];
    const targetUserGenres = targetUserData.genre_preference || [];
    
    // 活動レベルを取得
    const userActivityLevel = await calculateActivityLevel(userId);
    const targetUserActivityLevel = await calculateActivityLevel(targetUserId);
    
    const score = calculateMatchingScore(
      userInterests,
      targetUserInterests,
      userGenres,
      targetUserGenres,
      userWatchHistory,
      targetUserWatchHistory,
      userActivityLevel,
      targetUserActivityLevel,
      userData?.is_premium || false,
      targetUserData.is_premium
    );
    
    // 共通の視聴動画の詳細情報を取得
    const commonVideoDetails = await getVideoDetailsByIds(commonVideos.slice(0, 5));
    
    return {
      profile: {
        ...targetUserData,
        age,
        matching_score: score,
        activity_level: targetUserActivityLevel
      },
      commonInterests,
      commonVideos: commonVideoDetails
    };
    
  } catch (error) {
    console.error('マッチングプロフィール取得エラー:', error);
    return null;
  }
};

// 動画IDから詳細情報を取得
export const getVideoDetailsByIds = async (videoIds: string[]): Promise<any[]> => {
  if (!videoIds.length) return [];
  
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('id, youtube_id, title, thumbnail_url, channel_title')
      .in('id', videoIds)
      .limit(10);
    
    if (error) throw error;
    
    // チャンネル名のフォールバック
    return (data || []).map(video => ({
      id: video.id,
      youtube_id: video.youtube_id,
      title: video.title,
      thumbnail_url: video.thumbnail_url,
      channel_name: video.channel_title || 'チャンネル名不明'
    })) as VideoDetails[];
    
  } catch (error) {
    console.error('動画詳細取得エラー:', error);
    return [];
  }
};

// 共通の視聴動画を取得する（追加機能）
export const getCommonVideos = async (userId: string, targetUserId: string): Promise<VideoDetails[]> => {
  try {
    // 自分の視聴履歴を取得
    const userWatchHistory = await getUserWatchHistory(userId, 100);
    
    // 相手の視聴履歴を取得
    const targetUserWatchHistory = await getUserWatchHistory(targetUserId, 100);
    
    // 共通の視聴動画IDを見つける
    const commonVideoIds = userWatchHistory.filter(videoId => 
      targetUserWatchHistory.includes(videoId)
    );
    
    if (commonVideoIds.length === 0) {
      return [];
    }
    
    // 共通の視聴動画の詳細情報を取得
    const { data, error } = await supabase
      .from('videos')
      .select('id, youtube_id, title, thumbnail_url, channel_title')
      .in('id', commonVideoIds)
      .limit(20);

    if (error) throw error;

    // チャンネル名のフォールバック
    return (data || []).map(video => ({
      id: video.id,
      youtube_id: video.youtube_id,
      title: video.title,
      thumbnail_url: video.thumbnail_url,
      channel_name: video.channel_title || 'チャンネル名不明'
    })) as VideoDetails[];
    
  } catch (error) {
    console.error('共通視聴動画取得エラー:', error);
    return [];
  }
};

// マッチング設定を保存
export const saveMatchingPreferences = async (
  userId: string, 
  preferences: MatchingPreferences
): Promise<boolean> => {
  try {
    // location_preferenceがnullの場合は空オブジェクトを設定
    const locationPreference = preferences.location_preference || { prefecture: undefined, region: undefined };
    
    const { error } = await supabase
      .from('user_matching_preferences')
      .upsert({
        user_id: userId,
        gender_preference: preferences.gender_preference,
        age_range_min: preferences.age_range_min,
        age_range_max: preferences.age_range_max,
        location_preference: locationPreference,
        interest_tags: preferences.interest_tags,
        genre_preference: preferences.genre_preference,
        activity_level: preferences.activity_level,
        online_only: preferences.online_only || false,
        premium_only: preferences.premium_only || false,
        has_video_history: preferences.has_video_history || false,
        recent_activity: preferences.recent_activity || false,
        filter_skipped: preferences.filter_skipped !== undefined ? preferences.filter_skipped : true,
        min_common_interests: preferences.min_common_interests || 0,
        max_distance: preferences.max_distance || 0,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    return true;
    
  } catch (error) {
    console.error('マッチング設定保存エラー:', error);
    return false;
  }
};

// マッチング設定を取得
export const getMatchingPreferences = async (userId: string): Promise<MatchingPreferences> => {
  try {
    const { data, error } = await supabase
      .from('user_matching_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが存在しない場合はデフォルト値を返す
        return {
          gender_preference: 'any',
          age_range_min: 18,
          age_range_max: 99,
          location_preference: { prefecture: undefined, region: undefined },
          interest_tags: [],
          genre_preference: [],
          activity_level: 'moderate',
          online_only: false,
          premium_only: false,
          has_video_history: false,
          recent_activity: false,
          filter_skipped: true,
          min_common_interests: 0,
          max_distance: 0
        };
      } else {
        throw error;
      }
    }
    
    // location_preferenceがnullの場合は空オブジェクトを設定
    const locationPreference = data.location_preference || { prefecture: undefined, region: undefined };
    
    return {
      ...data,
      location_preference: locationPreference,
      online_only: data.online_only || false,
      premium_only: data.premium_only || false,
      has_video_history: data.has_video_history || false,
      recent_activity: data.recent_activity || false,
      filter_skipped: data.filter_skipped !== undefined ? data.filter_skipped : true
    } as MatchingPreferences;
    
  } catch (error) {
    console.error('マッチング設定取得エラー:', error);
    // デフォルト値を返す
    return {
      gender_preference: 'any',
      age_range_min: 18,
      age_range_max: 99,
      location_preference: { prefecture: undefined, region: undefined },
      interest_tags: [],
      genre_preference: [],
      activity_level: 'moderate',
      online_only: false,
      premium_only: false,
      has_video_history: false,
      recent_activity: false,
      filter_skipped: true,
      min_common_interests: 0,
      max_distance: 0
    };
 
  }
};
// ユーザーの視聴傾向を取得する関数
export const getViewingTrends = async (userId: string): Promise<Record<string, number>> => {
  try {
    // 過去90日間の視聴履歴を取得
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data, error } = await supabase
      .from('view_history')
      .select('video_id')
      .eq('user_id', userId)
      .gte('viewed_at', ninetyDaysAgo.toISOString());
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {};
    }
    
    // 視聴したビデオIDを取得
    const videoIds = data.map(item => item.video_id);
    
    // ビデオのジャンル情報を取得
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('id, genres')
      .in('id', videoIds);
      
    if (videoError) throw videoError;
    
    // ジャンルごとの視聴回数をカウント
    const genreCounts: Record<string, number> = {};
    
    videoData?.forEach(video => {
      if (video.genres && Array.isArray(video.genres)) {
        video.genres.forEach((genre: string) => {
          if (genreCounts[genre]) {
            genreCounts[genre]++;
          } else {
            genreCounts[genre] = 1;
          }
        });
      }
    });
    
    // 総視聴数を計算
    const totalCount = Object.values(genreCounts).reduce((sum, count) => sum + count, 0);
    
    // パーセンテージに変換
    const trendPercentages: Record<string, number> = {};
    
    if (totalCount > 0) {
      Object.keys(genreCounts).forEach(genre => {
        trendPercentages[genre] = Math.round((genreCounts[genre] / totalCount) * 100);
      });
    }
    
    // 値が大きい順にソートして上位8つのジャンルのみ返す
    const sortedGenres = Object.entries(trendPercentages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, number>);
    
    return sortedGenres;
    
  } catch (error) {
    console.error('視聴傾向取得エラー:', error);
    return {};
  }
};

// 共通の友達を取得する関数
export const getCommonFriends = async (userId: string, targetUserId: string): Promise<any[]> => {
  try {
    // 自分のフォロー/フレンド一覧を取得
    const { data: userFriends, error: userFriendsError } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', userId)
      .eq('status', 'connected');
      
    if (userFriendsError) throw userFriendsError;
    
    // 相手のフォロー/フレンド一覧を取得
    const { data: targetFriends, error: targetFriendsError } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', targetUserId)
      .eq('status', 'connected');
      
    if (targetFriendsError) throw targetFriendsError;
    
    // 友達のIDのみを抽出
    const userFriendIds = userFriends?.map(f => f.connected_user_id) || [];
    const targetFriendIds = targetFriends?.map(f => f.connected_user_id) || [];
    
    // 共通の友達を抽出
    const commonFriendIds = userFriendIds.filter(id => targetFriendIds.includes(id));
    
    if (commonFriendIds.length === 0) {
      return [];
    }
    
    // 共通の友達のプロフィール情報を取得
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', commonFriendIds);
      
    if (profileError) throw profileError;
    
    return profileData || [];
    
  } catch (error) {
    console.error('共通の友達取得エラー:', error);
    return [];
  }
};

// YouTubeチャンネル情報を取得する関数
export const getYouTubeChannelData = async (userId: string): Promise<{ channel_url?: string } | null> => {
  try {
    // ユーザーのYouTuberプロファイルを取得
    const { data, error } = await supabase
      .from('youtuber_profiles')
      .select('channel_url, channel_id')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      // ユーザーがYouTuberとして登録されていなくてもエラーとして扱わない
      if (error.code === 'PGRST116') {
        return { channel_url: undefined };
      }
      throw error;
    }
    
    if (!data) {
      return { channel_url: undefined };
    }
    
    // チャンネルURLが存在する場合はそのまま返す
    if (data.channel_url) {
      return { channel_url: data.channel_url };
    }
    
    // チャンネルIDがある場合はURLを構築
    if (data.channel_id) {
      return { channel_url: `https://www.youtube.com/channel/${data.channel_id}` };
    }
    
    return { channel_url: undefined };
    
  } catch (error) {
    console.error('YouTubeチャンネル情報取得エラー:', error);
    return null;
  }
};