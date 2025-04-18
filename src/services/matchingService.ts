// src/services/matchingService.ts

import { supabase } from '../lib/supabase';
import { 
  MatchingUser, 
  MatchingPreferences, 
  UserPoints, 
  Message, 
  Conversation,
  VideoDetails,
  SkippedUser,
  OnlineStatus,
  ActivityLevel,
  ConnectionStatus,
  GenderPreference,
  LocationPreference
} from '../types/matching';
import { notificationService } from '../services/notificationService';

// ポイント関連のユーティリティ関数をインポート
import { 
  getPoints, 
  consumePoints, 
  addPoints, 
  hasEnoughPoints 
} from '../utils/pointsUtils';

// 戻り値の型定義
export interface SendLikeResult {
  success: boolean;
  isMatch: boolean;
  conversationId?: string;
  error?: string;
}

export interface SkipResult {
  success: boolean;
  error?: string;
}

export interface ConnectionResult {
  success: boolean;
  status: ConnectionStatus;
  connectionId?: string;
  error?: string;
}

export interface ResetConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * テーブルが存在するか確認する関数
 * @param tableName - テーブル名
 * @returns テーブルが存在するかどうか
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    if (!tableName) {
      console.error('テーブル名が指定されていません');
      return false;
    }

    // キャッシュの実装（同じセッション内での重複チェック回避）
    const sessionCache = window.sessionStorage?.getItem(`table_exists_${tableName}`);
    if (sessionCache) {
      return sessionCache === 'true';
    }

    // 特定のテーブルに対する例外処理
    // アプリで使用されていないオプショナルテーブルのリスト
    const optionalTables = ['user_verification', 'profile_views', 'user_filter_usage'];
    if (optionalTables.includes(tableName)) {
      console.warn(`オプショナルテーブル ${tableName} はスキップされます`);
      // キャッシュに保存
      window.sessionStorage?.setItem(`table_exists_${tableName}`, 'false');
      return false;
    }

    try {
      // 直接テーブルにクエリを実行して存在確認
      const response = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(0);

      // 成功した場合、テーブルは存在する
      if (!response.error) {
        // キャッシュに保存
        window.sessionStorage?.setItem(`table_exists_${tableName}`, 'true');
        return true;
      }

      // エラーコードから判断
      if (response.error) {
        // 404/400エラーはテーブルが存在しない
        if (response.status === 404 || response.status === 400) {
          console.warn(`テーブル ${tableName} が存在しません (HTTP ${response.status})`);
          // キャッシュに保存
          window.sessionStorage?.setItem(`table_exists_${tableName}`, 'false');
          return false;
        }

        // PostgreSQLのテーブル存在しないエラー
        if (response.error.code === '42P01') {
          console.warn(`テーブル ${tableName} が存在しません (PostgreSQL 42P01)`);
          // キャッシュに保存
          window.sessionStorage?.setItem(`table_exists_${tableName}`, 'false');
          return false;
        }

        // PGRST116はテーブルは存在するがレコードがないケース
        if (response.error.code === 'PGRST116') {
          // キャッシュに保存
          window.sessionStorage?.setItem(`table_exists_${tableName}`, 'true');
          return true;
        }
      }

      // デフォルトではテーブルは存在しないと判断
      console.warn(`テーブル ${tableName} へのアクセスでエラー: ${response.error?.message || '不明なエラー'}`);
      // キャッシュに保存
      window.sessionStorage?.setItem(`table_exists_${tableName}`, 'false');
      return false;
    } catch (queryError) {
      console.error(`テーブルクエリエラー (${tableName}):`, queryError);
      // キャッシュに保存
      window.sessionStorage?.setItem(`table_exists_${tableName}`, 'false');
      return false;
    }
  } catch (error) {
    console.error(`テーブル存在確認例外 (${tableName}):`, error);
    return false;
  }
};

/**
 * テーブルが存在しない場合に作成する関数
 * @param tableName - テーブル名
 * @returns 作成に成功したかどうか
 */
export const createTableIfNotExists = async (tableName: string): Promise<boolean> => {
  try {
    if (!tableName) {
      console.error('テーブル名が指定されていません');
      return false;
    }
    
    // テーブルが存在するか確認
    const tableExists = await checkTableExists(tableName);
    
    if (tableExists) {
      return true; // 既に存在する場合は成功とみなす
    }
    
    // Supabaseではテーブル作成はRPC関数やSQL実行ではなく
    // ダッシュボードやマイグレーションを通じて行うので、
    // テーブルが存在しない場合はfalseを返す
    console.warn(`テーブル ${tableName} が存在しません。Supabaseダッシュボードから作成してください。`);
    return false;
  } catch (error) {
    console.error(`テーブル作成エラー (${tableName}):`, error);
    return false;
  }
};

/**
 * マッチングスコアを計算する関数
 * @param userInterests - ユーザーの興味リスト
 * @param otherUserInterests - 相手ユーザーの興味リスト
 * @param userGenres - ユーザーの好きなジャンルリスト
 * @param otherUserGenres - 相手ユーザーの好きなジャンルリスト
 * @param userVideos - ユーザーが視聴した動画IDリスト
 * @param otherUserVideos - 相手ユーザーが視聴した動画IDリスト
 * @param userActivity - ユーザーの活動レベル (1-10)
 * @param otherUserActivity - 相手ユーザーの活動レベル (1-10)
 * @param isPremium - ユーザーがプレミアム会員か
 * @param otherIsPremium - 相手ユーザーがプレミアム会員か
 * @returns マッチングスコア (0-100)
 */
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
  // nullやundefinedのチェックとデフォルト値の設定
  const safeUserInterests = userInterests || [];
  const safeOtherUserInterests = otherUserInterests || [];
  const safeUserGenres = userGenres || [];
  const safeOtherUserGenres = otherUserGenres || [];
  const safeUserVideos = userVideos || [];
  const safeOtherUserVideos = otherUserVideos || [];
  
  // 共通の興味を計算
  const commonInterests = safeUserInterests.filter(interest => 
    safeOtherUserInterests.includes(interest)
  );
  
  // 共通のジャンルを計算
  const commonGenres = safeUserGenres.filter(genre => 
    safeOtherUserGenres.includes(genre)
  );
  
  // 共通の視聴動画を計算
  const commonVideos = safeUserVideos.filter(video =>
    safeOtherUserVideos.includes(video)
  );
  
  // 興味のスコア (最大30点)
  const interestScore = Math.min(
    (commonInterests.length / Math.max(safeUserInterests.length, 1)) * 30,
    30
  );
  
  // ジャンルのスコア (最大25点)
  const genreScore = Math.min(
    (commonGenres.length / Math.max(safeUserGenres.length, 1)) * 25,
    25
  );
  
  // 視聴動画の共通性スコア (最大20点)
  const videoScore = Math.min(
    (commonVideos.length / Math.min(10, Math.max(safeUserVideos.length, 1))) * 20,
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

/**
 * ユーザーの活動レベルを計算する関数
 * @param userId - ユーザーID
 * @returns 活動レベル (1-10)
 */
export const calculateActivityLevel = async (userId: string): Promise<number> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }

    // 過去30日間のログイン回数を取得
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // テーブル存在チェックと該当テーブルからのデータ取得を並列実行
    const [
      userLoginsExists,
      commentsExists,
      videoRatingsExists,
      messagesExists
    ] = await Promise.all([
      checkTableExists('user_logins'),
      checkTableExists('comments'),
      checkTableExists('video_ratings'),
      checkTableExists('messages')
    ]);
    
    // 各テーブルからの取得処理
    const loginCountPromise = userLoginsExists ? 
      supabase
        .from('user_logins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('login_time', thirtyDaysAgo.toISOString()) : 
      Promise.resolve({ count: 0, error: null });
        
    const commentCountPromise = commentsExists ?
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString()) :
      Promise.resolve({ count: 0, error: null });
        
    const ratingCountPromise = videoRatingsExists ?
      supabase
        .from('video_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString()) :
      Promise.resolve({ count: 0, error: null });
        
    const messageCountPromise = messagesExists ?
      supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString()) :
      Promise.resolve({ count: 0, error: null });

    // 並列にデータを取得
    const [
      loginCountResult,
      commentCountResult,
      ratingCountResult,
      messageCountResult
    ] = await Promise.all([
      loginCountPromise,
      commentCountPromise,
      ratingCountPromise,
      messageCountPromise
    ]);
    
    // カウント結果を安全に取得
    const loginCount = loginCountResult.count || 0;
    const commentCount = commentCountResult.count || 0;
    const ratingCount = ratingCountResult.count || 0;
    const messageCount = messageCountResult.count || 0;
    
    // 活動レベルを計算 (1-10のスケール)
    // ログイン: 最大3点、コメント: 最大2点、評価: 最大2点、メッセージ: 最大3点
    const loginScore = Math.min((loginCount) / 10, 1) * 3;
    const commentScore = Math.min((commentCount) / 5, 1) * 2;
    const ratingScore = Math.min((ratingCount) / 5, 1) * 2;
    const messageScore = Math.min((messageCount) / 10, 1) * 3;
    
    return Math.round(loginScore + commentScore + ratingScore + messageScore);
  } catch (error) {
    console.error('活動レベル計算エラー:', error);
    return 5; // エラー時はデフォルト値を返す
  }
};

/**
 * ユーザーの視聴履歴を取得する関数
 * @param userId - ユーザーID
 * @param limit - 取得する履歴の最大数
 * @returns 視聴済み動画IDの配列
 */
export const getUserWatchHistory = async (userId: string, limit: number = 20): Promise<string[]> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }
    
    // view_historyテーブルが存在するか確認
    const viewHistoryExists = await checkTableExists('view_history');
    
    if (!viewHistoryExists) {
      console.warn('view_historyテーブルが存在しません');
      return [];
    }

    const { data, error } = await supabase
      .from('view_history')
      .select('video_id')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      throw error;
    }
    
    return data?.map(item => item.video_id) || [];
  } catch (error) {
    console.error('視聴履歴取得エラー:', error);
    return [];
  }
};

/**
 * ユーザーの性別を取得する関数
 * @param userId - ユーザーID
 * @returns ユーザーの性別
 */
export const getUserGender = async (userId: string): Promise<string | null> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('gender')
      .eq('id', userId)
      .limit(1);
      
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    return data[0].gender;
  } catch (error) {
    console.error('ユーザー性別取得エラー:', error);
    return null;
  }
};

/**
 * ユーザーがプレミアム機能を使用できるか確認する関数
 * 男性: プレミアム会員かどうかをチェック
 * 女性: 電話番号認証済みかどうかをチェック
 * @param userId - ユーザーID
 * @param isPremium - プレミアム会員かどうか
 * @returns 機能使用可能かどうか
 */
export const canUseMatchingFeature = async (
  userId: string,
  isPremium: boolean
): Promise<boolean> => {
  try {
    if (!userId) {
      return false;
    }
    
    // 性別を取得
    const gender = await getUserGender(userId);
    
    // 男性の場合はプレミアム会員かどうかをチェック
    if (gender === 'male') {
      return isPremium;
    }
    
    // 女性の場合は電話番号認証済みかどうかをチェック
    if (gender === 'female') {
      // user_verificationテーブルから直接認証状態を取得
      const { data, error } = await supabase
        .from('user_verification')
        .select('phone_verified')
        .eq('user_id', userId)
        .limit(1);
        
      if (error) {
        console.error('認証状態取得エラー:', error);
        return false;
      }
      
      return data && data.length > 0 && data[0].phone_verified === true;
    }
    
    // 性別が不明または未設定の場合はプレミアム会員かどうかをチェック（男性と同じ扱い）
    return isPremium;
  } catch (error) {
    console.error('マッチング機能使用権限チェックエラー:', error);
    return false;
  }
};

/**
 * ポイント消費が必要かどうかを確認する関数
 * 男性: プレミアム会員でない場合はポイント消費が必要
 * 女性: 無料で使用可能（電話番号認証済みの場合）
 * @param userId - ユーザーID
 * @param isPremium - プレミアム会員かどうか
 * @returns ポイント消費が必要かどうか
 */
export const needsPointConsumption = async (
  userId: string,
  isPremium: boolean
): Promise<boolean> => {
  try {
    if (!userId) {
      return true; // 安全のため、ユーザーIDがない場合はポイント消費が必要と判断
    }
    
    // プレミアム会員の場合はポイント消費不要
    if (isPremium) {
      return false;
    }
    
    // 性別を取得
    const gender = await getUserGender(userId);
    
    // 女性の場合は電話番号認証済みならポイント消費不要
    if (gender === 'female') {
      // user_verificationテーブルから直接認証状態を取得
      const { data, error } = await supabase
        .from('user_verification')
        .select('phone_verified')
        .eq('user_id', userId)
        .limit(1);
        
      if (error) {
        console.error('認証状態取得エラー:', error);
        return true; // エラー時は安全のためポイント消費が必要と判断
      }
      
      // phone_verifiedがtrueなら消費不要、それ以外は消費が必要
      return !(data && data.length > 0 && data[0].phone_verified === true);
    }
    
    // 男性またはその他の場合はプレミアム会員でない限りポイント消費が必要
    return true;
  } catch (error) {
    console.error('ポイント消費必要性チェックエラー:', error);
    return true; // エラー時は安全のためポイント消費が必要と判断
  }
};

// 他のすべての関数について、checkTableExistsを呼び出す部分はそのままにして、
// createTableIfNotExistsを呼び出す部分では、テーブルが存在しない場合は
// 警告を表示してから処理を続行するように修正します。

/**
 * マッチング候補を取得する関数
 * @param userId - ユーザーID
 * @param preferences - マッチング設定
 * @param isMatchedMode - マッチング済みモードかどうか（デフォルトはfalse）
 * @returns マッチング候補のリスト
 */
export const fetchMatchCandidates = async (
  userId: string, 
  preferences: MatchingPreferences,
  isMatchedMode: boolean = false
): Promise<MatchingUser[]> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }

    if (!preferences) {
      throw new Error('マッチング設定が指定されていません');
    }
    
    // 必要なテーブルの存在を確認
    const [
      profilesExists,
      userSkipsExists,
      userLikesExists,
      connectionsExists,
      userMatchesExists  // ユーザーマッチテーブルの存在も確認
    ] = await Promise.all([
      checkTableExists('profiles'),
      checkTableExists('user_skips'),
      checkTableExists('user_likes'),
      checkTableExists('connections'),
      checkTableExists('user_matches')  // 追加
    ]);
    
    if (!profilesExists) {
      console.error('profilesテーブルが存在しません');
      return [];
    }

    // 現在のユーザーの情報を取得
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('interests, genre_preference, is_premium')
      .eq('id', userId)
      .limit(1);
      
    if (userError) {
      console.error('プロフィール取得エラー:', userError);
      return [];
    }

    if (!userData || userData.length === 0) {
      console.error('ユーザーデータが見つかりません:', userId);
      return [];
    }

    const userProfile = userData[0];

    // 現在のユーザーの活動レベルを取得
    const userActivityLevel = await calculateActivityLevel(userId);

    // 現在のユーザーの視聴履歴を取得
    const userWatchHistory = await getUserWatchHistory(userId, 50);

    // スキップデータとライクデータを並列に取得
    let skippedData: any[] = [];
    let likedData: any[] = [];
    
    // マッチング済みユーザーデータを取得（成立したマッチング一覧用）
    let matchedData: any[] = [];
    
    // 並列に実行する処理
    const fetchPromises = [];
    
    if (userSkipsExists) {
      fetchPromises.push(
        supabase
          .from('user_skips')
          .select('skipped_user_id')
          .eq('user_id', userId)
          .then(result => {
            if (!result.error) {
              skippedData = result.data || [];
            } else {
              console.error('スキップデータ取得エラー:', result.error);
            }
          })
      );
    }
    
    if (userLikesExists) {
      fetchPromises.push(
        supabase
          .from('user_likes')
          .select('liked_user_id')
          .eq('user_id', userId)
          .then(result => {
            if (!result.error) {
              likedData = result.data || [];
            } else {
              console.error('いいねデータ取得エラー:', result.error);
            }
          })
      );
    }
    
    // マッチング済みユーザーの取得
    if (userMatchesExists) {
      fetchPromises.push(
        supabase
          .from('user_matches')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .then(result => {
            if (!result.error) {
              matchedData = result.data || [];
            } else {
              console.error('マッチングデータ取得エラー:', result.error);
            }
          })
      );
    }
    
    // すべてのPromiseを待機
    await Promise.all(fetchPromises);
      
    // 除外するユーザーIDのリスト
    const skippedIds = skippedData?.map(s => s.skipped_user_id) || [];
    const likedIds = likedData?.map(l => l.liked_user_id) || [];
    
    // マッチング済みユーザーのIDリストを作成
    const matchedIds = matchedData?.flatMap(m => [
      m.user1_id === userId ? m.user2_id : m.user1_id
    ]) || [];
    
    
    
    // マッチング候補を取得するクエリを構築
    let query = supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, interests, genre_preference, is_premium, gender, birth_date, location, online_status, last_active, matching_enabled');

    // 自分自身は明示的にIDで除外
    query = query.neq('id', userId);
    
    // マッチング済みモードの場合とそうでない場合で異なるクエリを構築
    if (isMatchedMode) {
      // マッチング済みユーザーのみを取得
      if (matchedIds.length > 0) {
        query = query.in('id', matchedIds);
      } else {
        // マッチングが一つもない場合は空の結果を返す
        return [];
      }
    } else {
      // 通常のマッチングモード: スキップしたユーザーを除外するフラグがオンの場合のみスキップユーザーを除外
      const excludeIds: string[] = [];
      if (preferences.filter_skipped && skippedIds.length > 0) {
        excludeIds.push(...skippedIds);
      }

      // いいねしたユーザーを除外するかどうかはオプションで切り替え可能に
      const excludeLikedUsers = preferences.exclude_liked_users !== false; // デフォルトでは除外
      if (excludeLikedUsers && likedIds.length > 0) {
        excludeIds.push(...likedIds);
      }

      // マッチング済みユーザーは通常の検索では除外
      if (matchedIds.length > 0) {
        excludeIds.push(...matchedIds);
      }

      // 除外IDがある場合の処理を修正
      if (excludeIds.length > 0) {
        // 除外IDが少ない場合はnot.inを直接使用
        if (excludeIds.length <= 10) {
          query = query.not('id', 'in', `(${excludeIds.join(',')})`);
        } else {
          // 除外IDが多い場合は、別のアプローチを使用
          try {
            // まず対象となる全ユーザーを取得 (excludeIdsを考慮せずに)
            const { data: eligibleProfiles } = await supabase
              .from('profiles')
              .select('id')
              .neq('id', userId)
              .eq('matching_enabled', true);
            
            if (eligibleProfiles && eligibleProfiles.length > 0) {
              // 全候補からexcludeIdsを除外した候補のみを取得
              const includeIds = eligibleProfiles
                .map((p: any) => p.id)
                .filter((id: string) => !excludeIds.includes(id));
              
              if (includeIds.length > 0) {
                // 条件をリセットして、includeIdsを使用して対象を直接指定
                query = supabase
                  .from('profiles')
                  .select('id, username, avatar_url, bio, interests, genre_preference, is_premium, gender, birth_date, location, online_status, last_active, matching_enabled')
                  .in('id', includeIds);
              } else {
                // 除外対象が多すぎて候補がない場合
                console.warn('フィルター適用後の候補がありません');
                return [];
              }
            }
          } catch (filterError) {
            console.error('除外フィルター作成エラー:', filterError);
            // 候補が多すぎる場合はフィルタリングを諦めてランダムに候補を取得
            query = supabase
              .from('profiles')
              .select('id, username, avatar_url, bio, interests, genre_preference, is_premium, gender, birth_date, location, online_status, last_active, matching_enabled')
              .neq('id', userId)
              .eq('matching_enabled', true)
              .limit(20);
          }
        }
      }

      // マッチングが有効なユーザーのみに限定
      query = query.eq('matching_enabled', true);

      // 他の条件を追加（マッチング済みモードでは適用しない）
      if (preferences.gender_preference && preferences.gender_preference !== GenderPreference.ANY) {
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
        query = query.eq('online_status', OnlineStatus.ONLINE);
      }

      // プレミアムユーザーのみ表示設定
      if (preferences.premium_only) {
        query = query.eq('is_premium', true);
      }

      // 視聴履歴があるユーザーのみフィルタリング（パフォーマンス向上のため条件付きで実行）
      if (preferences.has_video_history) {
        const viewHistoryExists = await checkTableExists('view_history');
        
        if (viewHistoryExists) {
          try {
            // 視聴履歴テーブルから重複なしでユーザーIDを取得
            const { data: usersWithHistory, error: historyError } = await supabase
              .from('view_history')
              .select('user_id')
              .limit(1000);
            
            if (historyError) {
              console.error('視聴履歴ユーザー取得エラー:', historyError);
            } else if (usersWithHistory && usersWithHistory.length > 0) {
              // 重複を取り除いてユニークなユーザーIDのみにする
              const uniqueUserIds = [...new Set(usersWithHistory.map((u: any) => u.user_id))];
              query = query.in('id', uniqueUserIds);
            }
          } catch (e) {
            console.error('視聴履歴フィルタリングエラー:', e);
            // エラーでも続行
          }
        }
      }

      // 最近活動したユーザーのみフィルタリング
      if (preferences.recent_activity) {
        // 一週間以内にログインしたユーザーのみ
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        query = query.gte('last_active', oneWeekAgo.toISOString());
      }
    }

   // 活動レベルでフィルタリング（プレミアムユーザーのみ）
   if (userProfile?.is_premium && preferences.activity_level && !isMatchedMode) {
    // この処理は後で実装（活動レベルごとにスコアでフィルタリング）
    // 現時点では条件を追加しない
  }

  // 最終的に取得件数を制限
  query = query.limit(20);

  // クエリ実行
  const { data, error } = await query;

  if (error) {
    console.error('マッチング候補取得エラー:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 各ユーザーの活動レベルと視聴履歴を取得
  const candidatesWithDetails = await Promise.all(data.map(async (candidate) => {
    try {
      // 活動レベルと視聴履歴を並列に取得
      const [activityLevel, watchHistory] = await Promise.all([
        calculateActivityLevel(candidate.id),
        getUserWatchHistory(candidate.id, 50)
      ]);
      
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
    const userInterests = userProfile?.interests || [];
    
    const candidateGenres = candidate.genre_preference || [];
    const userGenres = userProfile?.genre_preference || [];
    
    const score = calculateMatchingScore(
      userInterests,
      candidateInterests,
      userGenres,
      candidateGenres,
      userWatchHistory,
      candidate.watch_history || [],
      userActivityLevel,
      candidate.activity_level || 5,
      userProfile?.is_premium || false,
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
    
    // 列挙型を使用してオンラインステータスを設定
    const onlineStatus = 
      (candidate.online_status && Object.values(OnlineStatus).includes(candidate.online_status as OnlineStatus))
        ? candidate.online_status as OnlineStatus
        : OnlineStatus.OFFLINE;
        
    // いいね済みかどうかを判定
    const isLiked = likedIds.includes(candidate.id);
        
    return {
      id: candidate.id,
      username: candidate.username || 'ユーザー',
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
      online_status: onlineStatus,
      last_active: candidate.last_active || null,
      is_liked: isLiked,  // いいね済みフラグを追加
      connection_status: ConnectionStatus.NONE,
      is_matched: isMatchedMode // マッチング済みフラグを追加
    } as MatchingUser;
  });
  
  // マッチングスコアでソート
  const sortedCandidates = candidates.sort((a, b) => b.matching_score - a.matching_score);
  
  // 各ユーザーの接続状態を確認（効率化のため一括取得）
  if (connectionsExists) {
    const userIds = sortedCandidates.map(candidate => candidate.id);
    
    try {
      // 自分が送信した接続リクエスト
      const { data: sentConnections, error: sentError } = await supabase
        .from('connections')
        .select('connected_user_id, status')
        .eq('user_id', userId)
        .in('connected_user_id', userIds);
      
      // 自分が受信した接続リクエスト
      const { data: receivedConnections, error: receivedError } = await supabase
        .from('connections')
        .select('user_id, status')
        .eq('connected_user_id', userId)
        .in('user_id', userIds);
      
      if (!sentError && !receivedError) {
        // 接続状態をマップに保存
        const connectionMap = new Map<string, ConnectionStatus>();
        
        sentConnections?.forEach(conn => {
          connectionMap.set(conn.connected_user_id, conn.status as ConnectionStatus);
        });
        
        receivedConnections?.forEach(conn => {
          connectionMap.set(conn.user_id, conn.status as ConnectionStatus);
        });
        
        // マッチングユーザーに接続状態を追加
        return sortedCandidates.map(candidate => ({
          ...candidate,
          connection_status: connectionMap.get(candidate.id) || ConnectionStatus.NONE
        }));
      }
    } catch (error) {
      console.error('接続状態取得エラー:', error);
    }
  }
  
  return sortedCandidates;
} catch (error) {
  console.error('マッチング候補の取得エラー:', error);
  
  // エラー時には空の配列を返す
  return [];
}
};

/**
* ユーザーのポイント残高を取得する関数
* @param userId - ユーザーID
* @returns ポイント情報
*/
export const getUserPoints = async (userId: string): Promise<UserPoints> => {
try {
  if (!userId) {
    throw new Error('ユーザーIDが指定されていません');
  }
  
  // user_pointsテーブルが存在するか確認
  const userPointsExists = await checkTableExists('user_points');
  
  if (!userPointsExists) {
    console.warn('user_pointsテーブルが存在しません');
    return {
      balance: 0,
      lifetime_earned: 0,
      last_updated: new Date().toISOString()
    };
  }
  
  // pointsUtils.tsのgetPoints関数を使用
  return await getPoints(userId);
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

/**
* いいねを送信する関数
* @param userId - ユーザーID
* @param targetUserId - いいね対象のユーザーID
* @param isPremium - 送信者がプレミアム会員か
* @returns 処理結果
*/
export const sendLike = async (
userId: string,
targetUserId: string,
isPremium: boolean
): Promise<SendLikeResult> => {
try {
  if (!userId || !targetUserId) {
    return {
      success: false,
      isMatch: false,
      error: 'ユーザーIDまたは対象ユーザーIDが指定されていません'
    };
  }

  if (userId === targetUserId) {
    return {
      success: false,
      isMatch: false,
      error: '自分自身にいいねすることはできません'
    };
  }
  
  // 必要なテーブル存在チェック
  const [userLikesExists, userMatchesExists, conversationsExists] = await Promise.all([
    checkTableExists('user_likes'),
    checkTableExists('user_matches'),
    checkTableExists('conversations')
  ]);
  
  // テーブルが存在しない場合は作成
  if (!userLikesExists) {
    const created = await createTableIfNotExists('user_likes');
    if (!created) {
      return {
        success: false,
        isMatch: false,
        error: 'user_likesテーブルの作成に失敗しました'
      };
    }
  }

  if (!userMatchesExists) {
    await createTableIfNotExists('user_matches');
  }

  if (!conversationsExists) {
    await createTableIfNotExists('conversations');
  }

  // 既にいいねしているか確認
  const { data: existingLike, error: checkError } = await supabase
    .from('user_likes')
    .select()
    .eq('user_id', userId)
    .eq('liked_user_id', targetUserId)
    .limit(1);
    
  if (checkError) {
    console.error('いいね確認エラー:', checkError);
    return {
      success: false,
      isMatch: false,
      error: 'いいね確認中にエラーが発生しました'
    };
  }
    
  if (existingLike && existingLike.length > 0) {
    return {
      success: true,
      isMatch: false,
      error: '既にいいねしています'
    };
  }
  
  // ポイント消費が必要かどうかを確認
  const needsPoints = await needsPointConsumption(userId, isPremium);
  
  // ポイント消費が必要な場合はポイントの確認と消費を行う
  if (needsPoints) {
    // ポイント消費に十分なポイントがあるか確認
    const hasPoints = await hasEnoughPoints(userId, 5);
    if (!hasPoints) {
      return {
        success: false,
        isMatch: false,
        error: 'ポイントが不足しています'
      };
    }
  }
  
  // いいねを記録
  const { error } = await supabase
    .from('user_likes')
    .insert({
      user_id: userId,
      liked_user_id: targetUserId,
      created_at: new Date().toISOString()
    });
    
  if (error) {
    console.error('いいね記録エラー:', error);
    return {
      success: false,
      isMatch: false,
      error: 'いいねの記録に失敗しました'
    };
  }
    
  // ポイント消費が必要な場合のみポイントを消費
  if (needsPoints) {
    // ポイントを消費
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
        error: 'ポイント消費に失敗しました'
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
  
  if (matchError) {
    console.error('マッチング確認エラー:', matchError);
    return {
      success: true,
      isMatch: false,
      error: 'マッチング確認中にエラーが発生しました'
    };
  }

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
      
    if (matchInsertError) {
      console.error('マッチング記録エラー:', matchInsertError);
      return {
        success: true,
        isMatch: true,
        error: 'マッチングの記録に失敗しました'
      };
    }
        
    // 既存の会話を確認
    const { data: existingConv, error: existingConvError } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${userId})`)
      .limit(1);
    
    if (existingConvError && existingConvError.code !== '42P01') {
      console.error('会話確認エラー:', existingConvError);
      return {
        success: true,
        isMatch: true,
        error: '会話確認中にエラーが発生しました'
      };
    }
  
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
        .select();
        
      if (convError) {
        console.error('会話作成エラー:', convError);
        return {
          success: true,
          isMatch: true,
          error: '会話の作成に失敗しました'
        };
      }
      
      if (convData && convData.length > 0) {
        conversationId = convData[0].id;
      }
    }
  
    // 双方に通知を送信
    try {
      const matchScore = 85; // 本番環境でのマッチングスコア
      
      // 自分用のマッチング通知
      await notificationService.createMatchingNotification(
        targetUserId, // 相手のID
        userId, // 自分のID
        matchScore,
        'match'
      );
      
      // 相手用のマッチング通知
      await notificationService.createMatchingNotification(
        userId, // 自分のID
        targetUserId, // 相手のID  
        matchScore,
        'match'
      );
    } catch (notificationError) {
      console.error('マッチング通知エラー:', notificationError);
      // 通知失敗してもマッチング自体は成功させる
    }
    
    // マッチングボーナスポイントを加算
    try {
      // マッチング成立時のボーナスポイント付与 (両方のユーザーに)
      await addPoints(userId, 2, 'match_bonus', targetUserId, 'マッチング成立ボーナス');
      await addPoints(targetUserId, 2, 'match_bonus', userId, 'マッチング成立ボーナス');
    } catch (pointsError) {
      console.error('ポイント加算エラー:', pointsError);
      // ポイントエラーは処理続行
    }
     
    return { 
      success: true, 
      isMatch: true, 
      conversationId: conversationId 
    };
  } else {
    // マッチングが成立しなかった場合
    // 相手がプレミアム会員の場合のみ通知を送信
    try {
      const { data: targetUserData, error: targetUserError } = await supabase
        .from('profiles')
        .select('is_premium, username')
        .eq('id', targetUserId)
        .limit(1);

      if (targetUserError) {
        console.error('ユーザープロフィール取得エラー:', targetUserError);
        return {
          success: true,
          isMatch: false,
          error: 'ユーザープロフィール取得時にエラーが発生しました'
        };
      }
      
      // プレミアム会員への通知送信
      if (targetUserData && targetUserData.length > 0 && targetUserData[0].is_premium) {
        // いいね通知を送信
        const matchScore = 75; // 本番環境でのスコア
        await notificationService.createMatchingNotification(
          userId, // 自分のID
          targetUserId, // 相手のID
          matchScore,
          'like'
        );
      }
    } catch (error) {
      console.error('プレミアム確認エラー:', error);
      // エラーは処理続行
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
/**
 * ユーザーをスキップする関数
 * @param userId - ユーザーID
 * @param targetUserId - スキップするユーザーID
 * @returns 成功したかどうか
 */
export const skipUser = async (userId: string, targetUserId: string): Promise<SkipResult> => {
  try {
    if (!userId || !targetUserId) {
      return { success: false, error: 'ユーザーIDまたはスキップ対象のユーザーIDが指定されていません' };
    }
 
    if (userId === targetUserId) {
      return { success: false, error: '自分自身をスキップすることはできません' };
    }
    
    // user_skipsテーブルが存在するか確認
    const userSkipsExists = await checkTableExists('user_skips');
    
    if (!userSkipsExists) {
      // テーブルが存在しない場合は作成を試みる
      const created = await createTableIfNotExists('user_skips');
      if (!created) {
        return { success: false, error: 'user_skipsテーブルの作成に失敗しました' };
      }
    }
 
    // 既にスキップしているか確認
    const { data: existingSkip, error: checkError } = await supabase
      .from('user_skips')
      .select()
      .eq('user_id', userId)
      .eq('skipped_user_id', targetUserId)
      .limit(1);
 
    if (checkError) {
      console.error('スキップ確認エラー:', checkError);
      return { success: false, error: 'スキップ確認中にエラーが発生しました' };
    }
 
    if (existingSkip && existingSkip.length > 0) {
      return { success: true }; // 既にスキップ済み
    }
 
    const { error } = await supabase
      .from('user_skips')
      .insert({
        user_id: userId,
        skipped_user_id: targetUserId,
        created_at: new Date().toISOString()
      });
 
    if (error) {
      console.error('スキップ登録エラー:', error);
      return { success: false, error: 'スキップの登録に失敗しました' };
    }
 
    return { success: true };
 
  } catch (error) {
    console.error('スキップエラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'スキップ処理に失敗しました' 
    };
  }
 };
 
 /**
 * スキップを取り消す関数
 * @param userId - ユーザーID
 * @param targetUserId - スキップを取り消すユーザーID
 * @returns 成功したかどうか
 */
 export const undoSkip = async (userId: string, targetUserId: string): Promise<SkipResult> => {
  try {
    if (!userId || !targetUserId) {
      return { success: false, error: 'ユーザーIDまたはスキップ取り消し対象のユーザーIDが指定されていません' };
    }
    
    // user_skipsテーブルが存在するか確認
    const userSkipsExists = await checkTableExists('user_skips');
    
    if (!userSkipsExists) {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('user_skips');
      return { success: true }; // テーブルが存在しない場合は既に削除されているとみなす
    }
 
    const { error } = await supabase
      .from('user_skips')
      .delete()
      .eq('user_id', userId)
      .eq('skipped_user_id', targetUserId);
 
    if (error) {
      console.error('スキップ取り消しエラー:', error);
      return { success: false, error: 'スキップの取り消しに失敗しました' };
    }
 
    return { success: true };
 
  } catch (error) {
    console.error('スキップ取り消しエラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'スキップ取り消し処理に失敗しました' 
    };
  }
 };
 
 /**
 * スキップしたユーザーの一覧を取得する関数
 * @param userId - ユーザーID
 * @param limit - 取得する最大数
 * @returns スキップしたユーザーリスト
 */
 export const getSkippedUsers = async (userId: string, limit: number = 10): Promise<SkippedUser[]> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }
    
    // user_skipsテーブルが存在するか確認
    const userSkipsExists = await checkTableExists('user_skips');
    
    if (!userSkipsExists) {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('user_skips');
      console.warn('user_skipsテーブルが存在しないため新規作成しました');
      return [];
    }
 
    // スキップしたユーザーIDを取得
    const { data: skipData, error: skipError } = await supabase
      .from('user_skips')
      .select('skipped_user_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
 
    if (skipError) {
      if (skipError.code === '42P01') { // テーブルが存在しない場合
        console.warn('user_skipsテーブルが存在しません');
        return [];
      }
      throw skipError;
    }
 
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
      
      // オンラインステータスの列挙型を使用
      const onlineStatus = 
        (profile.online_status && Object.values(OnlineStatus).includes(profile.online_status as OnlineStatus))
          ? profile.online_status as OnlineStatus
          : OnlineStatus.OFFLINE;
      
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
        connection_status: ConnectionStatus.NONE,
        online_status: onlineStatus
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
 /**
 * 会話を取得する関数
 * @param conversationId - 会話ID
 * @param userId - ユーザーID
 * @returns 会話情報と相手ユーザー情報
 */
 export const getConversation = async (
  conversationId: string,
  userId: string
 ): Promise<{ conversation: Conversation; otherUser: any } | null> => {
  try {
    if (!conversationId || !userId) {
      throw new Error('会話IDまたはユーザーIDが指定されていません');
    }
    
    // conversationsテーブルが存在するか確認
    const conversationsExists = await checkTableExists('conversations');
    
    if (!conversationsExists) {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('conversations');
      console.warn('conversationsテーブルが存在しないため新規作成しました');
      return null;
    }
 
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .limit(1);
 
    if (error) {
      if (error.code === '42P01') { // テーブルが存在しない場合
        console.warn('conversationsテーブルが存在しません');
        return null;
      }
      throw error;
    }
 
    if (!data || data.length === 0) return null;

    const conversation = data[0];
 
    // 自分が参加していない会話の場合はnullを返す
    if (conversation.user1_id !== userId && conversation.user2_id !== userId) {
      return null;
    }
 
    // 相手のユーザーIDを特定
    const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
 
    // 相手のプロフィール情報を取得
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_premium, last_active, online_status')
      .eq('id', otherUserId)
      .limit(1);
 
    if (profileError) throw profileError;
    if (!profileData || profileData.length === 0) {
      throw new Error('相手のプロフィール情報が見つかりません');
    }

    const profile = profileData[0];
 
    // オンラインステータスを列挙型に変換
    const onlineStatus = 
      (profile.online_status && Object.values(OnlineStatus).includes(profile.online_status as OnlineStatus))
        ? profile.online_status as OnlineStatus
        : OnlineStatus.OFFLINE;
 
    // プロフィールデータの更新
    const updatedProfileData = {
      ...profile,
      online_status: onlineStatus
    };
 
    // 既読状態を更新
    const unreadField = conversation.user1_id === userId ? 'user1_unread_count' : 'user2_unread_count';
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ [unreadField]: 0 })
      .eq('id', conversationId);
 
    if (updateError) {
      console.error('会話既読状態更新エラー:', updateError);
    }
    
    // messagesテーブルが存在するか確認
    const messagesExists = await checkTableExists('messages');
    
    if (messagesExists) {
      // メッセージの既読状態を更新
      const { error: messageUpdateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', userId)
        .eq('is_read', false);
 
      if (messageUpdateError && messageUpdateError.code !== '42P01') {
        console.error('メッセージ既読状態更新エラー:', messageUpdateError);
      }
    } else {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('messages');
    }
 
    return {
      conversation: conversation as Conversation,
      otherUser: updatedProfileData
    };
 
  } catch (error) {
    console.error('会話取得エラー:', error);
    return null;
  }
 };
 
 /**
 * メッセージを取得する関数
 * @param conversationId - 会話ID
 * @param limit - 取得する最大メッセージ数
 * @param offset - 取得開始位置
 * @returns メッセージリスト
 */
 export const getMessages = async (conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> => {
  try {
    if (!conversationId) {
      throw new Error('会話IDが指定されていません');
    }
 
    if (limit <= 0) {
      throw new Error('limit は0より大きい値を指定してください');
    }
 
    if (offset < 0) {
      throw new Error('offset は0以上の値を指定してください');
    }
    
    // messagesテーブルが存在するか確認
    const messagesExists = await checkTableExists('messages');
    
    if (!messagesExists) {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('messages');
      console.warn('messagesテーブルが存在しないため新規作成しました');
      return [];
    }
 
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
 
    if (error) {
      if (error.code === '42P01') { // テーブルが存在しない場合
        console.warn('messagesテーブルが存在しません');
        return [];
      }
      throw error;
    }
 
    return (data || []).reverse() as Message[];
 
  } catch (error) {
    console.error('メッセージ取得エラー:', error);
    return [];
  }
 };
 
 /**
 * メッセージを送信する関数
 * @param userId - 送信者ID
 * @param receiverId - 受信者ID
 * @param conversationId - 会話ID
 * @param content - メッセージ内容
 * @param isHighlighted - ハイライトメッセージかどうか
 * @param isPremium - 送信者がプレミアム会員か
 * @returns 処理結果
 */
 export const sendMessage = async (
  userId: string,
  receiverId: string,
  conversationId: string,
  content: string,
  isHighlighted: boolean = false,
  isPremium: boolean = false
 ): Promise<{ success: boolean; message?: Message; error?: string }> => {
  try {
    // 入力バリデーション
    if (!userId || !receiverId || !conversationId) {
      throw new Error('必須パラメータが不足しています');
    }
 
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
    
    // 必要なテーブルの存在確認と作成
    const [messagesExists, conversationsExists] = await Promise.all([
      checkTableExists('messages'),
      checkTableExists('conversations')
    ]);
    
    if (!messagesExists) {
      const created = await createTableIfNotExists('messages');
      if (!created) {
        return {
          success: false,
          error: 'messagesテーブルの作成に失敗しました'
        };
      }
    }
 
    if (!conversationsExists) {
      await createTableIfNotExists('conversations');
    }
 
    // ポイント消費が必要かどうかを確認
    const needsPoints = await needsPointConsumption(userId, isPremium);
    
    // ポイント消費が必要な場合はポイントの確認と消費を行う
    if (needsPoints) {
      const pointAmount = isHighlighted ? 10 : 1;
      
      // ポイント残高を確認
      const hasPoints = await hasEnoughPoints(userId, pointAmount);
      if (!hasPoints) {
        return {
          success: false,
          error: 'ポイントが不足しています'
        };
      }
      
      // ポイントを消費
      const pointsConsumed = await consumePoints(userId, pointAmount, 'message', receiverId);
      if (!pointsConsumed) {
        return {
          success: false,
          error: 'ポイント消費に失敗しました'
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
      .select();
 
    if (error) throw error;
    
    if (!data || data.length === 0) {
      throw new Error('メッセージの挿入に失敗しました');
    }

    const message = data[0];
    
    // 会話の最終メッセージ時間とunread_countを更新
    if (conversationsExists) {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .limit(1);
 
      if (!convError && convData && convData.length > 0) {
        const conversation = convData[0];
        const unreadField = conversation.user1_id === userId ? 'user2_unread_count' : 'user1_unread_count';
        
        // 未読カウントを取得して1増やす
        let currentCount = conversation[unreadField] || 0;
        currentCount += 1;
        
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ 
            last_message_time: new Date().toISOString(),
            [unreadField]: currentCount,
            is_active: true  // 会話を常にアクティブに
          })
          .eq('id', conversationId);
 
        if (updateError) {
          console.error('会話更新エラー:', updateError);
        }
      }
    }
 
    // 相手のオンライン状態を確認
    const { data: receiverData, error: receiverError } = await supabase
      .from('profiles')
      .select('online_status, is_premium')
      .eq('id', receiverId)
      .limit(1);
 
    if (receiverError) {
      console.error('受信者プロフィール取得エラー:', receiverError);
    }
 
    // オフラインまたはオンライン状態が不明の場合は通知を送信
    if (!receiverData || receiverData.length === 0 || receiverData[0].online_status !== OnlineStatus.ONLINE) {
      try {
        const { error: notificationError } = await supabase
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
        
        if (notificationError) {
          console.error('通知送信エラー:', notificationError);
        }
      } catch (notifyError) {
        console.error('通知作成中のエラー:', notifyError);
        // 通知エラーは処理続行
      }
    }

    // メッセージ送信アクティビティでポイント付与 (プレミアム会員じゃない場合は5メッセージごとに1ポイント)
    if (!isPremium) {
      try {
        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', userId);

        if (countError) {
          console.error('メッセージ数取得エラー:', countError);
        } else if (count && count % 5 === 0) {
          // 5メッセージごとにボーナスポイント付与
          await addPoints(userId, 1, 'message_activity', receiverId, 'メッセージ活動ボーナス');
        }
      } catch (pointsError) {
        console.error('活動ポイント加算エラー:', pointsError);
        // ポイントエラーは処理続行
      }
    }
 
    return {
      success: true,
      message: message as Message
    };
  } catch (error) {
    console.error('メッセージ送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メッセージの送信に失敗しました'
    };
  }
 };
 /**
 * 会話リストを取得する関数
 * @param userId - ユーザーID
 * @param searchTerm - 検索キーワード（オプション）
 * @returns 会話リスト
 */
 export const getConversations = async (userId: string, searchTerm?: string): Promise<any[]> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }
    
    // 必要なテーブルの存在確認
    const [conversationsExists, messagesExists] = await Promise.all([
      checkTableExists('conversations'),
      checkTableExists('messages')
    ]);
    
    if (!conversationsExists) {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('conversations');
      console.warn('conversationsテーブルが存在しないため新規作成しました');
      return [];
    }
    
    if (!messagesExists) {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('messages');
    }
    
    // 基本クエリ - 関連テーブルを外部結合せずに会話情報のみ取得
    let query = supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('is_active', true)  // アクティブな会話のみ
      .order('last_message_time', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      if (error.code === '42P01') { // テーブルが存在しない場合
        console.warn('conversationsテーブルが存在しません');
        return [];
      }
      throw error;
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // 会話ごとに相手のユーザー情報を取得して結合
    const conversationsWithProfiles = await Promise.all(data.map(async (conv: any) => {
      const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
      
      // 相手のプロフィール情報を取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_premium, online_status, last_active')
        .eq('id', otherUserId)
        .limit(1);
      
      if (profileError) {
        console.error('プロフィール取得エラー:', profileError);
        return null;
      }
      
      if (!profileData || profileData.length === 0) {
        return null;
      }

      const profile = profileData[0];
      
      // オンラインステータスを列挙型に変換
      const onlineStatus = 
        (profile.online_status && Object.values(OnlineStatus).includes(profile.online_status as OnlineStatus))
          ? profile.online_status as OnlineStatus
          : OnlineStatus.OFFLINE;
      
      // プロフィールデータの更新
      const updatedProfileData = {
        ...profile,
        online_status: onlineStatus
      };
      
      // 検索条件に一致するか確認
      if (searchTerm && updatedProfileData.username.toLowerCase().indexOf(searchTerm.toLowerCase()) === -1) {
        return null;
      }
      
      // 最新のメッセージを取得 - 会話ごとに個別にクエリ
      let lastMessage = null;
      if (messagesExists) {
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
        otherUser: updatedProfileData,
        last_message: lastMessage,
        unread_count: unreadCount || 0
      };
    }));
    
    // nullを除外し、最新のメッセージ順にソート
    return conversationsWithProfiles
      .filter((conv): conv is any => conv !== null)
      .sort((a: any, b: any) => {
        const aTime = new Date(a.last_message_time).getTime();
        const bTime = new Date(b.last_message_time).getTime();
        return bTime - aTime;
      });
    
  } catch (error) {
    console.error('会話リスト取得エラー:', error);
    return [];
  }
 };
 
 /**
 * 会話を非アクティブ化する関数（削除に相当）
 * @param conversationId - 会話ID
 * @param userId - ユーザーID
 * @returns 成功したかどうか
 */
 export const deactivateConversation = async (conversationId: string, userId: string): Promise<boolean> => {
  try {
    if (!conversationId || !userId) {
      throw new Error('会話IDまたはユーザーIDが指定されていません');
    }
    
    // conversationsテーブルが存在するか確認
    const conversationsExists = await checkTableExists('conversations');
    
    if (!conversationsExists) {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('conversations');
      console.warn('conversationsテーブルが存在しないため新規作成しました');
      return false;
    }
    
    // 自分が参加者かどうか確認
    const { data, error } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // テーブルが存在しない場合
        console.warn('conversationsテーブルが存在しません');
        return false;
      }
      throw error;
    }
    
    if (!data || data.length === 0 || (data[0].user1_id !== userId && data[0].user2_id !== userId)) {
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
 
 /**
 * マッチングプロフィールを取得する関数
 * @param userId - ユーザーID
 * @param targetUserId - 対象ユーザーID
 * @returns プロフィール情報、共通の興味、共通の視聴動画
 */
 export const getMatchingProfile = async (userId: string, targetUserId: string): Promise<{ profile: any; commonInterests: string[]; commonVideos: VideoDetails[] } | null> => {
  try {
    if (!userId || !targetUserId) {
      throw new Error('ユーザーIDまたは対象ユーザーIDが指定されていません');
    }
    
    // profilesテーブルが存在するか確認
    const profilesExists = await checkTableExists('profiles');
    
    if (!profilesExists) {
      console.error('profilesテーブルが存在しません');
      return null;
    }
    
    // 自分のプロフィール情報を取得
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('interests, genre_preference, is_premium')
      .eq('id', userId)
      .limit(1);
    
    if (userError) {
      if (userError.code === '42P01') { // テーブルが存在しない場合
        console.error('profilesテーブルが存在しません');
        return null;
      }
      throw userError;
    }
    
    if (!userData || userData.length === 0) {
      console.error('ユーザープロフィールが見つかりません');
      return null;
    }

    const userProfile = userData[0];
    
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
      .limit(1);
    
    if (targetUserError) {
      if (targetUserError.code === '42P01') { // テーブルが存在しない場合
        console.error('profilesテーブルが存在しません');
        return null;
      }
      throw targetUserError;
    }
    
    if (!targetUserData || targetUserData.length === 0) return null;

    const targetProfile = targetUserData[0];
    
    // ポイント消費が必要かどうかを確認
    const needsPoints = await needsPointConsumption(userId, userProfile?.is_premium || false);
    
    // ポイント消費が必要な場合はポイントの確認と消費を行う
    if (needsPoints) {
      // user_pointsテーブルが存在するか確認
      const userPointsExists = await checkTableExists('user_points');
      
      if (userPointsExists) {
        // ポイント消費に十分なポイントがあるか確認
        const hasPoints = await hasEnoughPoints(userId, 5);
        if (!hasPoints) {
          throw new Error('ポイントが不足しています');
        }
        
        // ポイントを消費
        const pointsConsumed = await consumePoints(userId, 5, 'profile_view', targetUserId);
        if (!pointsConsumed) {
          throw new Error('ポイント消費に失敗しました');
        }
      } else {
        // テーブルが存在しない場合は作成
        await createTableIfNotExists('user_points');
      }
    }
    
    // 自分と相手の視聴履歴を並列に取得
    const [userWatchHistory, targetUserWatchHistory] = await Promise.all([
      getUserWatchHistory(userId, 50),
      getUserWatchHistory(targetUserId, 50)
    ]);
    
    // 共通の興味を計算
    const userInterests = userProfile?.interests || [];
    const targetUserInterests = targetProfile.interests || [];
    const commonInterests = userInterests.filter((interest: string) => 
      targetUserInterests.includes(interest)
    );
    
    // 共通の視聴動画を計算
    const commonVideoIds = userWatchHistory.filter(video => 
      targetUserWatchHistory.includes(video)
    );
    
    // 年齢を計算
    let age: number | null = null;
    if (targetProfile.birth_date) {
      const birthDate = new Date(targetProfile.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
    
    // マッチングスコアを計算
    const userGenres = userProfile?.genre_preference || [];
    const targetUserGenres = targetProfile.genre_preference || [];
    
    // 活動レベルを取得
    const [userActivityLevel, targetUserActivityLevel] = await Promise.all([
      calculateActivityLevel(userId),
      calculateActivityLevel(targetUserId)
    ]);
    
    const score = calculateMatchingScore(
      userInterests,
      targetUserInterests,
      userGenres,
      targetUserGenres,
      userWatchHistory,
      targetUserWatchHistory,
      userActivityLevel,
      targetUserActivityLevel,
      userProfile?.is_premium || false,
      targetProfile.is_premium
    );
    
    // オンラインステータスを列挙型に変換
    const onlineStatus = 
      (targetProfile.online_status && Object.values(OnlineStatus).includes(targetProfile.online_status as OnlineStatus))
        ? targetProfile.online_status as OnlineStatus
        : OnlineStatus.OFFLINE;
    
    // 共通の視聴動画の詳細情報を取得
    const commonVideoDetails = await getVideoDetailsByIds(commonVideoIds.slice(0, 5));
    
    return {
      profile: {
        ...targetProfile,
        age,
        matching_score: score,
        activity_level: targetUserActivityLevel,
        online_status: onlineStatus
      },
      commonInterests,
      commonVideos: commonVideoDetails
    };
    
  } catch (error) {
    console.error('マッチングプロフィール取得エラー:', error);
    return null;
  }
 };
 
 /**
 * 動画IDから詳細情報を取得する関数
 * @param videoIds - 動画IDの配列
 * @returns 動画詳細情報の配列
 */
 export const getVideoDetailsByIds = async (videoIds: string[]): Promise<VideoDetails[]> => {
  if (!videoIds.length) return [];
  
  try {
    // videosテーブルが存在するか確認
    const videosExists = await checkTableExists('videos');
    
    if (!videosExists) {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('videos');
      console.warn('videosテーブルが存在しないため新規作成しました');
      return [];
    }
    
    const { data, error } = await supabase
      .from('videos')
      .select('id, youtube_id, title, thumbnail, channel_title')
      .in('id', videoIds)
      .limit(10);
    
    if (error) {
      if (error.code === '42P01') { // テーブルが存在しない場合
        console.warn('videosテーブルが存在しません');
        return [];
      }
      console.error('動画詳細取得エラー:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // チャンネル名のフォールバック
    return data.map(video => ({
      id: video.id,
      youtube_id: video.youtube_id,
      title: video.title || 'タイトルなし',
      thumbnail_url: video.thumbnail || `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`,
      channel_name: video.channel_title || 'チャンネル名不明'
    })) as VideoDetails[];
    
  } catch (error) {
    console.error('動画詳細取得エラー:', error);
    return [];
  }
 };
 
 /**
 * 共通の視聴動画を取得する関数
 * @param userId - ユーザーID
 * @param targetUserId - 対象ユーザーID
 * @returns 共通の視聴動画リスト
 */
 export const getCommonVideos = async (userId: string, targetUserId: string): Promise<VideoDetails[]> => {
  try {
    if (!userId || !targetUserId) {
      throw new Error('ユーザーIDまたは対象ユーザーIDが指定されていません');
    }
    
    // view_historyテーブルが存在するか確認
    const viewHistoryExists = await checkTableExists('view_history');
    
    if (!viewHistoryExists) {
      // テーブルが存在しない場合は作成
      await createTableIfNotExists('view_history');
      console.warn('view_historyテーブルが存在しないため新規作成しました');
      return [];
    }
    
    // 自分と相手の視聴履歴を並列に取得
    const [userWatchHistory, targetUserWatchHistory] = await Promise.all([
      getUserWatchHistory(userId, 100),
      getUserWatchHistory(targetUserId, 100)
    ]);
    
    // 共通の視聴動画IDを見つける
    const commonVideoIds = userWatchHistory.filter(videoId => 
      targetUserWatchHistory.includes(videoId)
    );
    
    if (commonVideoIds.length === 0) {
      return [];
    }
    
    // 共通の視聴動画の詳細情報を取得
    return await getVideoDetailsByIds(commonVideoIds);
    
  } catch (error) {
    console.error('共通視聴動画取得エラー:', error);
    return [];
  }
 };
 
 /**
 * マッチング設定を保存する関数
 * @param userId - ユーザーID
 * @param preferences - マッチング設定
 * @param isPremium - プレミアムユーザーかどうか
 * @returns 成功したかどうか
 */
 export const saveMatchingPreferences = async (
  userId: string, 
  preferences: MatchingPreferences,
  isPremium: boolean = false
 ): Promise<boolean> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }
    
    if (!preferences) {
      throw new Error('マッチング設定が指定されていません');
    }
    
    // 必要なテーブルの存在確認
    const [userMatchingPreferencesExists, userPointsExists, userFilterUsageExists] = await Promise.all([
      checkTableExists('user_matching_preferences'),
      checkTableExists('user_points'),
      checkTableExists('user_filter_usage')
    ]);
    
    if (!userMatchingPreferencesExists) {
      // テーブルが存在しない場合は作成
      const created = await createTableIfNotExists('user_matching_preferences');
      if (!created) {
        console.error('user_matching_preferencesテーブルの作成に失敗しました');
        return false;
      }
    }
    
    // パラメータのバリデーション
    if (preferences.age_range_min && (preferences.age_range_min < 18 || preferences.age_range_min > 99)) {
      throw new Error('最小年齢は18〜99の間で指定してください');
    }
    
    if (preferences.age_range_max && (preferences.age_range_max < 18 || preferences.age_range_max > 99)) {
      throw new Error('最大年齢は18〜99の間で指定してください');
    }
    
    if (preferences.age_range_min && preferences.age_range_max && preferences.age_range_min > preferences.age_range_max) {
      throw new Error('最小年齢は最大年齢以下である必要があります');
    }
    
    // 詳細フィルター設定の使用条件チェック
    const isUsingDetailedFilters = 
      preferences.online_only || 
      preferences.premium_only || 
      preferences.has_video_history || 
      preferences.recent_activity || 
      (preferences.min_common_interests !== undefined && preferences.min_common_interests > 0) || 
      (preferences.max_distance !== undefined && preferences.max_distance > 0);
    
    // ポイント消費が必要かどうかを確認
    const needsPoints = await needsPointConsumption(userId, isPremium);
    
    // プレミアムでない場合は詳細設定を使用時のみポイントを消費
    if (needsPoints && isUsingDetailedFilters) {
      if (!userPointsExists) {
        // テーブルが存在しない場合は作成
        await createTableIfNotExists('user_points');
      } else {
        // ポイント消費に十分なポイントがあるか確認
        const hasPoints = await hasEnoughPoints(userId, 3);
        if (!hasPoints) {
          return false;
        }
        
        // ポイントを消費
        const pointsConsumed = await consumePoints(userId, 3, 'filter_usage', undefined);
        if (!pointsConsumed) {
          return false;
        }
      }
      
      // フィルター使用記録を残す
      if (!userFilterUsageExists) {
        // テーブルが存在しない場合は作成
        await createTableIfNotExists('user_filter_usage');
      }
      
      try {
        await supabase
          .from('user_filter_usage')
          .insert({
            user_id: userId,
            points_used: 3,
            applied_at: new Date().toISOString(),
            filter_settings: preferences
          });
      } catch (filterError) {
        console.error('フィルター使用記録エラー:', filterError);
        // 処理は続行
      }
    }
    
    // location_preferenceがnullの場合は空オブジェクトを設定
    const locationPreference: LocationPreference = preferences.location_preference || { 
      prefecture: undefined,
      region: undefined 
    };
    
    // GenderPreferenceの列挙型を使用
    const genderPref = preferences.gender_preference || GenderPreference.ANY;
    
    // ActivityLevelの列挙型を使用
    const activityLevel = 
      (preferences.activity_level && Object.values(ActivityLevel).includes(preferences.activity_level as ActivityLevel))
        ? preferences.activity_level
        : ActivityLevel.MODERATE;
    
    const { error } = await supabase
      .from('user_matching_preferences')
      .upsert({
        user_id: userId,
        gender_preference: genderPref,
        age_range_min: preferences.age_range_min || 18,
        age_range_max: preferences.age_range_max || 99,
        location_preference: locationPreference,
        interest_tags: preferences.interest_tags || [],
        genre_preference: preferences.genre_preference || [],
        activity_level: activityLevel,
        online_only: preferences.online_only || false,
        premium_only: preferences.premium_only || false,
        has_video_history: preferences.has_video_history || false,
        recent_activity: preferences.recent_activity || false,
        filter_skipped: preferences.filter_skipped !== undefined ? preferences.filter_skipped : true,
        min_common_interests: preferences.min_common_interests || 0,
        max_distance: preferences.max_distance || 0,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('マッチング設定保存エラー:', error);
      throw error;
    }
    
    return true;
    
  } catch (error) {
    console.error('マッチング設定保存エラー:', error);
    return false;
  }
 };
 
 /**
 * マッチング設定を取得する関数
 * @param userId - ユーザーID
 * @returns マッチング設定
 */
 export const getMatchingPreferences = async (userId: string): Promise<MatchingPreferences> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }
    
    // user_matching_preferencesテーブルが存在するか確認
    const userMatchingPreferencesExists = await checkTableExists('user_matching_preferences');
    
    if (!userMatchingPreferencesExists) {
      // テーブルが存在しない場合は作成
      const created = await createTableIfNotExists('user_matching_preferences');
      if (!created) {
        console.error('user_matching_preferencesテーブルの作成に失敗しました');
        // デフォルト値を返す
        return getDefaultMatchingPreferences();
      }
    }
    
    // .single()を使わずに、limitで1件だけ取得するように修正
    const { data, error } = await supabase
      .from('user_matching_preferences')
      .select('*')
      .eq('user_id', userId)
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // テーブルが存在しない場合
        console.warn('user_matching_preferencesテーブルが存在しません');
        return getDefaultMatchingPreferences();
      }
      console.error('マッチング設定取得エラー:', error);
      throw error;
    }
    
    // データが見つからない場合はデフォルト値を返す
    if (!data || data.length === 0) {
      return getDefaultMatchingPreferences();
    }
    
    // 配列の最初の要素を使用
    const preferences = data[0];
    
    // location_preferenceがnullの場合は空オブジェクトを設定
    const locationPreference: LocationPreference = preferences.location_preference || { 
      prefecture: undefined,
      region: undefined 
    };
    
    // GenderPreferenceの列挙型を使用
    const genderPref = 
      (preferences.gender_preference && Object.values(GenderPreference).includes(preferences.gender_preference as GenderPreference))
        ? preferences.gender_preference as GenderPreference
        : GenderPreference.ANY;
    
    // ActivityLevelの列挙型を使用
    const activityLevel = 
      (preferences.activity_level && Object.values(ActivityLevel).includes(preferences.activity_level as ActivityLevel))
        ? preferences.activity_level as ActivityLevel
        : ActivityLevel.MODERATE;
    
    return {
      ...preferences,
      gender_preference: genderPref,
      activity_level: activityLevel,
      location_preference: locationPreference,
      online_only: preferences.online_only || false,
      premium_only: preferences.premium_only || false,
      has_video_history: preferences.has_video_history || false,
      recent_activity: preferences.recent_activity || false,
      filter_skipped: preferences.filter_skipped !== undefined ? preferences.filter_skipped : true,
      interest_tags: preferences.interest_tags || [],
      genre_preference: preferences.genre_preference || [],
      min_common_interests: preferences.min_common_interests || 0,
      max_distance: preferences.max_distance || 0
    } as MatchingPreferences;
  } catch (error) {
    console.error('マッチング設定取得エラー:', error);
    // デフォルト値を返す
    return getDefaultMatchingPreferences();
  }
 };
 
 /**
 * デフォルトのマッチング設定を取得する関数
 * @returns デフォルトのマッチング設定
 */
 export const getDefaultMatchingPreferences = (): MatchingPreferences => {
  return {
    gender_preference: GenderPreference.ANY,
    age_range_min: 18,
    age_range_max: 99,
    location_preference: { prefecture: undefined, region: undefined },
    interest_tags: [],
    genre_preference: [],
    activity_level: ActivityLevel.MODERATE,
    online_only: false,
    premium_only: false,
    has_video_history: false,
    recent_activity: false,
    filter_skipped: true,
    min_common_interests: 0,
    max_distance: 0
  };
 };
 
 /**
 * ユーザーの視聴傾向を取得する関数
 * @param userId - ユーザーID
 * @returns ジャンルごとの視聴割合
 */
 export const getViewingTrends = async (userId: string): Promise<Record<string, number>> => {
   try {
     if (!userId) {
       throw new Error('ユーザーIDが指定されていません');
     }
     
     // 必要なテーブルの存在確認
     const [viewHistoryExists, videosExists] = await Promise.all([
       checkTableExists('view_history'), 
       checkTableExists('videos')
     ]);
     
     if (!viewHistoryExists || !videosExists) {
       // 不足しているテーブルの作成
       const createPromises = [];
       if (!viewHistoryExists) createPromises.push(createTableIfNotExists('view_history'));
       if (!videosExists) createPromises.push(createTableIfNotExists('videos'));
       
       await Promise.all(createPromises);
       console.warn('view_historyテーブルまたはvideosテーブルが存在しないため新規作成しました');
       return {};
     }
     
     // 過去90日間の視聴履歴を取得
     const ninetyDaysAgo = new Date();
     ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
     
     const { data, error } = await supabase
     .from('view_history')
     .select('video_id')
     .eq('user_id', userId)
     .gte('viewed_at', ninetyDaysAgo.toISOString());
  
     if (error) {
       if (error.code === '42P01') { // テーブルが存在しない場合
         console.warn('view_historyテーブルが存在しません');
         return {};
       }
       throw error;
     }
     
     if (!data || data.length === 0) {
       return {};
     }
     
     // 視聴したビデオIDを取得
     const videoIds = data.map(item => item.video_id);
     
     // ビデオのジャンル情報を取得
     const { data: videoData, error: videoError } = await supabase
       .from('videos')
       .select('id, genre_id')
       .in('id', videoIds);
     
     if (videoError) {
       if (videoError.code === '42P01') { // テーブルが存在しない場合
         console.warn('videosテーブルが存在しません');
         return {};
       }
       throw videoError;
     }
     
     // ジャンルごとの視聴回数をカウント
     const genreCounts: Record<string, number> = {};
     
     videoData?.forEach(video => {
       if (video.genre_id) {
         if (genreCounts[video.genre_id]) {
           genreCounts[video.genre_id]++;
         } else {
           genreCounts[video.genre_id] = 1;
         }
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
  
  /**
  * 共通の友達を取得する関数
  * @param userId - ユーザーID
  * @param targetUserId - 対象ユーザーID
  * @returns 共通の友達リスト
  */
  export const getCommonFriends = async (userId: string, targetUserId: string): Promise<any[]> => {
   try {
     if (!userId || !targetUserId) {
       throw new Error('ユーザーIDまたは対象ユーザーIDが指定されていません');
     }
     
     // connectionsテーブルが存在するか確認
     const connectionsExists = await checkTableExists('connections');
     
     if (!connectionsExists) {
       // テーブルが存在しない場合は作成
       await createTableIfNotExists('connections');
       console.warn('connectionsテーブルが存在しないため新規作成しました');
       return [];
     }
     
     // 自分のフォロー/フレンド一覧と相手のフォロー/フレンド一覧を並列に取得
     const [userFriendsResult, targetFriendsResult] = await Promise.all([
       supabase
         .from('connections')
         .select('connected_user_id')
         .eq('user_id', userId)
         .eq('status', ConnectionStatus.CONNECTED),
       supabase
         .from('connections')
         .select('connected_user_id')
         .eq('user_id', targetUserId)
         .eq('status', ConnectionStatus.CONNECTED)
     ]);
     
     // エラーチェック
     if (userFriendsResult.error) {
       if (userFriendsResult.error.code === '42P01') { // テーブルが存在しない場合
         console.warn('connectionsテーブルが存在しません');
         return [];
       }
       throw userFriendsResult.error;
     }
     
     if (targetFriendsResult.error) {
       if (targetFriendsResult.error.code === '42P01') { // テーブルが存在しない場合
         console.warn('connectionsテーブルが存在しません');
         return [];
       }
       throw targetFriendsResult.error;
     }
     
     // 友達のIDのみを抽出
     const userFriendIds = userFriendsResult.data?.map(f => f.connected_user_id) || [];
     const targetFriendIds = targetFriendsResult.data?.map(f => f.connected_user_id) || [];
     
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
  
  /**
  * YouTubeチャンネル情報を取得する関数
  * @param userId - ユーザーID
  * @returns YouTubeチャンネル情報
  */
  export const getYouTubeChannelData = async (userId: string): Promise<{ channel_url?: string } | null> => {
   try {
     if (!userId) {
       throw new Error('ユーザーIDが指定されていません');
     }
     
     // youtuber_profilesテーブルが存在するか確認
     const youtuberProfilesExists = await checkTableExists('youtuber_profiles');
     
     if (!youtuberProfilesExists) {
       // テーブルが存在しない場合は作成
       await createTableIfNotExists('youtuber_profiles');
       console.warn('youtuber_profilesテーブルが存在しないため新規作成しました');
       return { channel_url: undefined };
     }
     
     // ユーザーのYouTuberプロファイルを取得
     const { data, error } = await supabase
       .from('youtuber_profiles')
       .select('channel_url, channel_id')
       .eq('id', userId)
       .limit(1);
     
     if (error) {
       // ユーザーがYouTuberとして登録されていなくてもエラーとして扱わない
       if (error.code === 'PGRST116' || error.code === '42P01') {
         return { channel_url: undefined };
       }
       throw error;
     }
     
     // データがない場合
     if (!data || data.length === 0) {
       return { channel_url: undefined };
     }

     const profile = data[0];
     
     // チャンネルURLが存在する場合はそのまま返す
     if (profile.channel_url) {
       return { channel_url: profile.channel_url };
     }
     
     // チャンネルIDがある場合はURLを構築
     if (profile.channel_id) {
       return { channel_url: `https://www.youtube.com/channel/${profile.channel_id}` };
     }
     
     return { channel_url: undefined };
     
   } catch (error) {
     console.error('YouTubeチャンネル情報取得エラー:', error);
     return null;
   }
  };
  
  /**
  * ユーザー間の接続リクエストを送信する関数
  * @param userId - リクエスト送信者のユーザーID
  * @param targetUserId - リクエスト受信者のユーザーID
  * @returns 処理結果
  */
  export const connectUsers = async (
   userId: string,
   targetUserId: string
  ): Promise<ConnectionResult> => {
   try {
     if (!userId || !targetUserId) {
       return {
         success: false,
         status: ConnectionStatus.NONE,
         error: 'ユーザーIDまたは対象ユーザーIDが指定されていません'
       };
     }
  
     if (userId === targetUserId) {
       return {
         success: false,
         status: ConnectionStatus.NONE,
         error: '自分自身に接続リクエストを送ることはできません'
       };
     }
     
     // connectionsテーブルが存在するか確認
     const connectionsExists = await checkTableExists('connections');
     
     if (!connectionsExists) {
       // テーブルが存在しない場合は作成
       const created = await createTableIfNotExists('connections');
       if (!created) {
         return {
           success: false,
           status: ConnectionStatus.NONE,
           error: 'connectionsテーブルの作成に失敗しました'
         };
       }
     }
  
     // 既存の接続を確認
     const { data: existingConnection, error: checkError } = await supabase
       .from('connections')
       .select('id, status, user_id, connected_user_id')
       .or(`and(user_id.eq.${userId},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${userId})`)
       .limit(1);
  
     if (checkError) {
       console.error('接続確認エラー:', checkError);
       return {
         success: false,
         status: ConnectionStatus.NONE,
         error: '接続確認中にエラーが発生しました'
       };
     }
  
     // 既に接続リクエストが存在する場合
     if (existingConnection && existingConnection.length > 0) {
       return {
         success: true,
         status: existingConnection[0].status as ConnectionStatus,
         connectionId: existingConnection[0].id
       };
     }
  
     // 新しい接続を作成
     const { data, error: connectionError } = await supabase
       .from('connections')
       .insert({
         user_id: userId,
         connected_user_id: targetUserId,
         status: ConnectionStatus.PENDING,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       })
       .select();
  
     if (connectionError) {
       console.error('接続作成エラー:', connectionError);
       return {
         success: false,
         status: ConnectionStatus.NONE,
         error: '接続レコードの作成に失敗しました'
       };
     }
  
     if (!data || data.length === 0) {
       return {
         success: false,
         status: ConnectionStatus.NONE,
         error: '接続データの取得に失敗しました'
       };
     }

     const newConnection = data[0];
  
     // 相手ユーザーに通知を送信
     try {
       // 通知サービスを使用して通知を作成
       const matchScore = 70;
       await notificationService.createMatchingNotification(
         userId, // 送信者ID
         targetUserId, // 対象ユーザーID
         matchScore,
         'connection_request'
       );
     } catch (notifyError) {
       console.error('通知送信エラー:', notifyError);
       // 通知エラーは処理続行
     }
  
     return {
       success: true,
       status: ConnectionStatus.PENDING,
       connectionId: newConnection.id
     };
  
   } catch (error) {
     console.error('接続リクエスト送信エラー:', error);
     return {
       success: false,
       status: ConnectionStatus.NONE,
       error: error instanceof Error ? error.message : '接続リクエストの送信に失敗しました'
     };
   }
  };
  
  /**
  * 接続をリセットする関数
  * @param userId - ユーザーID
  * @param targetUserId - 対象ユーザーID
  * @returns 処理結果
  */
  export const resetConnection = async (
   userId: string,
   targetUserId: string
  ): Promise<ResetConnectionResult> => {
   try {
     if (!userId || !targetUserId) {
       return { 
         success: false, 
         error: 'ユーザーIDまたは対象ユーザーIDが指定されていません' 
       };
     }
     
     // connectionsテーブルが存在するか確認
     const connectionsExists = await checkTableExists('connections');
     
     if (!connectionsExists) {
       // テーブルが存在しない場合は作成
       await createTableIfNotExists('connections');
       return { success: true }; // テーブルが存在しない場合は既に削除されているとみなす
     }
  
     const { error: deleteError } = await supabase
       .from('connections')
       .delete()
       .or(`and(user_id.eq.${userId},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${userId})`);
  
     if (deleteError) {
       console.error('接続削除エラー:', deleteError);
       return { 
         success: false, 
         error: '接続の削除に失敗しました' 
       };
     }
  
     return {
       success: true
     };
   } catch (error) {
     console.error('接続リセットエラー:', error);
     return {
       success: false,
       error: error instanceof Error ? error.message : '接続のリセットに失敗しました'
     };
   }
  };