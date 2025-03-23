// src/hooks/useMatching.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
 MatchingUser, 
 MatchingPreferences, 
 TransactionType, 
 VideoDetails, 
 MatchingProfileDetails,
 SkippedUser
} from '../types/matching';
import { 
 fetchMatchCandidates, 
 sendLike, 
 skipUser, 
 undoSkip, 
 getUserPoints, 
 consumePoints, 
 addPoints, 
 getMatchingProfile, 
 calculateActivityLevel, 
 getUserWatchHistory,
 getMatchingPreferences,
 saveMatchingPreferences as saveMatchingPreferencesService,
 getCommonVideos,
 getSkippedUsers as getSkippedUsersService,
 getViewingTrends,
 getCommonFriends,
 getYouTubeChannelData
} from '../services/matchingService';

export const useMatching = () => {
 const { user, isPremium: authIsPremium } = useAuth(); // AuthContextからisPremiumを直接取得
 const [loading, setLoading] = useState<boolean>(false);
 const [matchedUsers, setMatchedUsers] = useState<MatchingUser[]>([]);
 const [currentUserIndex, setCurrentUserIndex] = useState<number>(0);
 const [preferences, setPreferences] = useState<MatchingPreferences | null>(null);
 const [loadingPreferences, setLoadingPreferences] = useState<boolean>(false);
 const [processingAction, setProcessingAction] = useState<boolean>(false);
 const [remainingPoints, setRemainingPoints] = useState<number>(0);
 const [isPremium, setIsPremium] = useState<boolean>(false);
 const [userProfile, setUserProfile] = useState<any>(null);
 const [noMoreUsers, setNoMoreUsers] = useState<boolean>(false);
 const [commonVideos, setCommonVideos] = useState<VideoDetails[]>([]);
 const [activityLevel, setActivityLevel] = useState<number>(0);
 const [detailedProfile, setDetailedProfile] = useState<MatchingProfileDetails | null>(null);
 const [userHistory, setUserHistory] = useState<string[]>([]);
 const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
 const [skippedUsers, setSkippedUsers] = useState<SkippedUser[]>([]);
 const [loadingSkippedUsers, setLoadingSkippedUsers] = useState<boolean>(false);
 const [lastFilterCost, setLastFilterCost] = useState<number>(0);
 const [filterAppliedDate, setFilterAppliedDate] = useState<string | null>(null);
 const [viewingTrends, setViewingTrends] = useState<Record<string, number>>({});
 const [commonFriends, setCommonFriends] = useState<any[]>([]);

 // ユーザープロフィールを取得
 const fetchUserProfile = useCallback(async () => {
   if (!user) return;

   try {
     const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .eq('id', user.id)
       .single();

     if (error) throw error;
     setUserProfile(data);
     setIsPremium(data?.is_premium || authIsPremium || false);
     
     // ユーザーがプレミアム会員の場合はローカルストレージに保存（読み取り用）
     if (data?.is_premium || authIsPremium) {
       localStorage.setItem('is_premium', 'true');
     } else {
       localStorage.removeItem('is_premium');
     }
   } catch (error) {
     console.error('プロフィール情報の取得に失敗しました:', error);
   }
 }, [user, authIsPremium]);

 // ユーザーの活動レベルを取得
 const fetchUserActivityLevel = useCallback(async () => {
   if (!user) return;

   try {
     const level = await calculateActivityLevel(user.id);
     setActivityLevel(level);
   } catch (error) {
     console.error('活動レベルの取得に失敗しました:', error);
   }
 }, [user]);

 // ユーザーの視聴履歴を取得
 const fetchUserHistory = useCallback(async () => {
   if (!user) return;

   try {
     const history = await getUserWatchHistory(user.id, 50);
     setUserHistory(history);
   } catch (error) {
     console.error('視聴履歴の取得に失敗しました:', error);
   }
 }, [user]);

 // ユーザーのポイント残高を取得
 const fetchUserPoints = useCallback(async () => {
   if (!user) return;

   try {
     const userPoints = await getUserPoints(user.id);
     setRemainingPoints(userPoints.balance || 0);
   } catch (error) {
     console.error('ポイント情報の取得に失敗しました:', error);
     setRemainingPoints(0);
   }
 }, [user]);

 // ユーザーの視聴傾向を取得
 const fetchViewingTrends = useCallback(async (userId: string) => {
   try {
     const trends = await getViewingTrends(userId);
     setViewingTrends(trends);
     return trends;
   } catch (error) {
     console.error('視聴傾向の取得に失敗しました:', error);
     return {};
   }
 }, []);

 // 共通の友達を取得
 const fetchCommonFriends = useCallback(async (userId: string) => {
   if (!user) return [];

   try {
     const friends = await getCommonFriends(user.id, userId);
     setCommonFriends(friends);
     return friends;
   } catch (error) {
     console.error('共通の友達の取得に失敗しました:', error);
     return [];
   }
 }, [user]);

 // YouTubeチャンネル情報を取得
 const fetchYouTubeChannelInfo = useCallback(async (userId: string) => {
   try {
     const channelData = await getYouTubeChannelData(userId);
     return channelData;
   } catch (error) {
     console.error('YouTubeチャンネル情報の取得に失敗しました:', error);
     return null;
   }
 }, []);

 // マッチングユーザーを取得
 const fetchMatchedUsers = useCallback(async () => {
   if (!user || !preferences) return;

   setLoading(true);
   try {
     const candidates = await fetchMatchCandidates(user.id, preferences);
     
     if (!candidates || candidates.length === 0) {
       setMatchedUsers([]);
       setNoMoreUsers(true);
       return;
     }

     // ユーザー情報を強化（チャンネルURL取得など）
     const enhancedCandidates = await Promise.all(
       candidates.map(async (candidate) => {
         // 既にチャンネルURLがある場合はそのまま使用
         if (candidate.channel_url) {
           return candidate;
         }

         try {
           // ユーザーのYouTubeチャンネルURLを取得
           const channelData = await fetchYouTubeChannelInfo(candidate.id);
           if (channelData && channelData.channel_url) {
             return {
               ...candidate,
               channel_url: channelData.channel_url
             };
           }
         } catch (error) {
           console.error(`ユーザー${candidate.id}のチャンネル情報取得エラー:`, error);
         }

         return candidate;
       })
     );

     setMatchedUsers(enhancedCandidates);
     setCurrentUserIndex(0);
     setNoMoreUsers(false);
   } catch (error) {
     console.error('マッチングユーザーの取得に失敗しました:', error);
     toast.error('マッチングデータの読み込みに失敗しました');
   } finally {
     setLoading(false);
   }
 }, [user, preferences, fetchYouTubeChannelInfo]);

 // 次のユーザーに進む
 const nextUser = useCallback(() => {
   setDetailedProfile(null);
   setCommonVideos([]);
   setViewingTrends({});
   setCommonFriends([]);
   if (currentUserIndex < matchedUsers.length - 1) {
     setCurrentUserIndex(prevIndex => prevIndex + 1);
   } else {
     // マッチングユーザーがもう存在しない場合
     setNoMoreUsers(true);
   }
 }, [currentUserIndex, matchedUsers.length]);

 // 現在のユーザーを取得
 const getCurrentUser = useCallback(() => {
   if (matchedUsers.length === 0 || currentUserIndex >= matchedUsers.length) {
     return null;
   }
   return matchedUsers[currentUserIndex];
 }, [matchedUsers, currentUserIndex]);

 // スキップしたユーザーの一覧を取得
 const getSkippedUsers = useCallback(async (limit: number = 10): Promise<SkippedUser[]> => {
   if (!user) return [];

   setLoadingSkippedUsers(true);
   try {
     const skipped = await getSkippedUsersService(user.id, limit);
     setSkippedUsers(skipped);
     return skipped;
   } catch (error) {
     console.error('スキップしたユーザーの取得に失敗しました:', error);
     return [];
   } finally {
     setLoadingSkippedUsers(false);
   }
 }, [user]);

 // 共通の視聴動画を取得
 const getUserCommonVideos = useCallback(async (targetUserId: string): Promise<VideoDetails[]> => {
   if (!user) return [];

   try {
     const videos = await getCommonVideos(user.id, targetUserId);
     setCommonVideos(videos);
     return videos;
   } catch (error) {
     console.error('共通視聴動画の取得に失敗しました:', error);
     return [];
   }
 }, [user]);

 // マッチング設定を取得
 const fetchPreferences = useCallback(async () => {
   if (!user) return;

   setLoadingPreferences(true);
   try {
     const prefs = await getMatchingPreferences(user.id);
     setPreferences(prefs);
     
     // フィルター適用日の取得
     const { data } = await supabase
       .from('user_filter_usage')
       .select('applied_at, points_used')
       .eq('user_id', user.id)
       .order('applied_at', { ascending: false })
       .limit(1)
       .single();
       
     if (data) {
       setFilterAppliedDate(data.applied_at);
       setLastFilterCost(data.points_used || 0);
     }
   } catch (error) {
     console.error('マッチング設定の取得に失敗しました:', error);
     toast.error('設定の読み込みに失敗しました');
     
     // エラー時はデフォルト値を設定
     setPreferences({
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
     });
   } finally {
     setLoadingPreferences(false);
   }
 }, [user]);

 // マッチング設定を保存
 const savePreferences = async (newPreferences: MatchingPreferences): Promise<boolean> => {
   if (!user) return false;

   setProcessingAction(true);
   try {
     // 詳細フィルター使用時のポイント消費チェック（プレミアム会員以外）
     const detailedFilterActive = 
       newPreferences.online_only === true || 
       newPreferences.premium_only === true || 
       newPreferences.has_video_history === true || 
       newPreferences.recent_activity === true;
     
     // プレミアム会員でない場合、かつ詳細フィルターが有効な場合
     if (!isPremium && detailedFilterActive) {
       // 同じ日に既にフィルターを適用済みかチェック
       const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
       const alreadyAppliedToday = filterAppliedDate && filterAppliedDate.startsWith(today);
       
       // 同じ日に適用していない場合はポイントを消費
       if (!alreadyAppliedToday) {
         if (remainingPoints < 3) {
           toast.error('詳細フィルターの使用には3ポイント必要です。ポイントが不足しています。');
           setProcessingAction(false);
           return false;
         }
         
         // ポイントを消費
         const pointsConsumed = await handleConsumePoints(3, 'filter_usage');
         if (!pointsConsumed) {
           throw new Error('ポイント消費に失敗しました');
         }
         
         // フィルター使用記録
         await supabase
           .from('user_filter_usage')
           .insert({
             user_id: user.id,
             applied_at: new Date().toISOString(),
             filter_type: 'detailed',
             points_used: 3
           });
         
         setFilterAppliedDate(new Date().toISOString());
         setLastFilterCost(3);
       }
     }

     const success = await saveMatchingPreferencesService(user.id, newPreferences);
     
     if (!success) throw new Error('設定の保存に失敗しました');

     setPreferences(newPreferences);
     
     // 設定を保存した後、マッチングユーザーを再取得
     await fetchMatchedUsers();
     return true;
   } catch (error) {
     console.error('設定の保存に失敗しました:', error);
     toast.error('設定の保存に失敗しました');
     return false;
   } finally {
     setProcessingAction(false);
   }
 };

 // いいね・マッチング処理
 const handleLike = async (userId: string): Promise<boolean> => {
   if (!user) return false;

   setProcessingAction(true);
   try {
     const result = await sendLike(user.id, userId, isPremium);
     
     if (!result.success) {
       if (result.error) {
         toast.error(result.error);
       } else {
         toast.error('いいねの送信に失敗しました');
       }
       return false;
     }
     
     if (result.isMatch) {
       toast.success('マッチングが成立しました！メッセージを送ってみましょう！', {
         duration: 5000,
         icon: '🎉'
       });
       
       // マッチング成立時にはボーナスポイントを付与（プレミアム会員以外）
       if (!isPremium) {
         await handleAddPoints(10, 'match_bonus', userId, 'マッチング成立ボーナス');
       }
     } else {
       toast.success('いいねを送りました！');
     }
     
     // ポイント残高を更新
     await fetchUserPoints();
     
     // 次のユーザーへ
     nextUser();
     return true;
   } catch (error) {
     console.error('いいね処理に失敗しました:', error);
     toast.error('処理に失敗しました。もう一度お試しください。');
     return false;
   } finally {
     setProcessingAction(false);
   }
 };

 // スキップ/パス処理
 const handleSkip = async (userId: string): Promise<boolean> => {
   if (!user) return false;

   setProcessingAction(true);
   try {
     const success = await skipUser(user.id, userId);
     
     if (!success) {
       throw new Error('スキップ処理に失敗しました');
     }
     
     // スキップ一覧を更新
     await getSkippedUsers();
     
     // 次のユーザーへ
     nextUser();
     return true;
   } catch (error) {
     console.error('スキップ処理に失敗しました:', error);
     return false;
   } finally {
     setProcessingAction(false);
   }
 };

 // スキップを取り消す
 const handleUndoSkip = async (userId: string): Promise<boolean> => {
   if (!user) return false;

   setProcessingAction(true);
   try {
     const success = await undoSkip(user.id, userId);
     
     if (!success) {
       throw new Error('スキップ取り消し処理に失敗しました');
     }
     
     toast.success('スキップを取り消しました');
     
     // スキップ一覧を更新
     await getSkippedUsers();
     
     return true;
   } catch (error) {
     console.error('スキップ取り消し処理に失敗しました:', error);
     toast.error('処理に失敗しました');
     return false;
   } finally {
     setProcessingAction(false);
   }
 };

 // ポイント消費処理（直接サービスを呼び出し）
 const handleConsumePoints = async (amount: number, transactionType: TransactionType, referenceId?: string): Promise<boolean> => {
   if (!user) return false;

   try {
     if (remainingPoints < amount) {
       toast.error('ポイントが不足しています');
       return false;
     }
     
     const success = await consumePoints(user.id, amount, transactionType, referenceId);
     
     if (!success) {
       throw new Error('ポイント消費に失敗しました');
     }
     
     // 残高を更新
     await fetchUserPoints();
     return true;
   } catch (error) {
     console.error('ポイント消費に失敗しました:', error);
     return false;
   }
 };

 // ポイント追加処理
 const handleAddPoints = async (amount: number, transactionType: TransactionType, referenceId?: string, description?: string): Promise<boolean> => {
   if (!user) return false;

   try {
     const success = await addPoints(user.id, amount, transactionType, referenceId, description);
     
     if (!success) {
       throw new Error('ポイント追加に失敗しました');
     }
     
     // 残高を更新
     await fetchUserPoints();
     return true;
   } catch (error) {
     console.error('ポイント追加に失敗しました:', error);
     return false;
   }
 };

 // 詳細プロフィール取得処理
 const fetchDetailedProfile = async (userId: string): Promise<MatchingProfileDetails | null> => {
   if (!user) return null;
   
   setLoadingDetails(true);
   try {
     // プレミアムユーザーならポイント消費なし、それ以外は5ポイント消費
     if (!isPremium) {
       if (remainingPoints < 5) {
         toast.error('ポイントが不足しています。ポイントを購入してください。');
         return null;
       }

       const pointsConsumed = await handleConsumePoints(5, 'profile_view', userId);
       if (!pointsConsumed) {
         throw new Error('ポイント消費に失敗しました');
       }
     }

     // 共通の視聴動画を取得
     const videos = await getUserCommonVideos(userId);
     
     // 視聴傾向を取得
     const trends = await fetchViewingTrends(userId);
     
     // 共通の友達を取得
     const friends = await fetchCommonFriends(userId);
     
     // 詳細プロフィールを取得
     const profileData = await getMatchingProfile(user.id, userId);
     
     if (!profileData) {
       throw new Error('プロフィール取得に失敗しました');
     }
     
     // ユーザー情報を拡張
     const enhancedProfile = {
       ...profileData,
       profile: {
         ...profileData.profile,
         viewing_trends: trends,
         common_friends: friends
       },
       commonVideos: videos
     };
     
     // もしチャンネルURLが無い場合は取得を試みる
     if (!enhancedProfile.profile.channel_url) {
       try {
         const channelData = await fetchYouTubeChannelInfo(userId);
         if (channelData && channelData.channel_url) {
           enhancedProfile.profile.channel_url = channelData.channel_url;
         }
       } catch (err) {
         console.error('YouTubeチャンネル情報の取得に失敗:', err);
       }
     }
     
     setDetailedProfile(enhancedProfile);

     // プロフィール閲覧履歴を記録
     await supabase
       .from('profile_views')
       .insert({
         viewer_id: user.id,
         viewed_user_id: userId,
         created_at: new Date().toISOString()
       });

     return enhancedProfile;
   } catch (error) {
     console.error('プロフィール閲覧処理に失敗しました:', error);
     toast.error('プロフィールの読み込みに失敗しました');
     return null;
   } finally {
     setLoadingDetails(false);
   }
 };

 // フィルター使用状況をチェックして日付が変わった場合はリセット
 const checkFilterUsageReset = useCallback(() => {
   if (!filterAppliedDate) return;
   
   const appliedDate = new Date(filterAppliedDate).toISOString().split('T')[0];
   const today = new Date().toISOString().split('T')[0];
   
   if (appliedDate !== today) {
     // 日付が変わったらリセット
     setFilterAppliedDate(null);
     setLastFilterCost(0);
   }
 }, [filterAppliedDate]);

 // スキップしたユーザーを見つける
 const findSkippedUser = useCallback((userId: string): SkippedUser | undefined => {
   return skippedUsers.find(user => user.id === userId);
 }, [skippedUsers]);

 // スキップからユーザーを復元してマッチング候補に追加
 const restoreSkippedUser = async (userId: string): Promise<boolean> => {
   if (!user) return false;

   setProcessingAction(true);
   try {
     // スキップを取り消す
     const success = await handleUndoSkip(userId);
     if (!success) return false;
     
     // 現在のプリファレンスがある場合のみ再フェッチ
     if (preferences) {
       await fetchMatchedUsers();
     }
     
     return true;
   } catch (error) {
     console.error('スキップしたユーザーの復元に失敗しました:', error);
     return false;
   } finally {
     setProcessingAction(false);
   }
 };

 // ロード時にユーザープロフィールを取得
 useEffect(() => {
   if (user) {
     fetchUserProfile();
     fetchUserPoints();
     fetchUserActivityLevel();
     fetchUserHistory();
     fetchPreferences();
     getSkippedUsers(20); // 最新のスキップ履歴を取得
   }
 }, [user, fetchUserProfile, fetchUserPoints, fetchUserActivityLevel, fetchUserHistory, fetchPreferences, getSkippedUsers]);

 // 設定が取得できたらマッチングユーザーを取得
 useEffect(() => {
   if (user && preferences) {
     fetchMatchedUsers();
   }
 }, [user, preferences, fetchMatchedUsers]);

 // 日付変更チェックを定期的に行う
 useEffect(() => {
   checkFilterUsageReset();
   
   // 1時間ごとにチェック
   const interval = setInterval(() => {
     checkFilterUsageReset();
   }, 60 * 60 * 1000);
   
   return () => clearInterval(interval);
 }, [checkFilterUsageReset]);

 // セッション終了前に未保存のデータをクリーンアップ
 useEffect(() => {
   const handleBeforeUnload = () => {
     // 必要に応じてクリーンアップ処理を実行
     // 例: 一時的なデータを削除するなど
   };

   window.addEventListener('beforeunload', handleBeforeUnload);
   return () => {
     window.removeEventListener('beforeunload', handleBeforeUnload);
   };
 }, []);

 return {
   loading,
   loadingPreferences,
   loadingDetails,
   loadingSkippedUsers,
   processingAction,
   matchedUsers,
   noMoreUsers,
   currentUser: getCurrentUser(),
   preferences,
   remainingPoints,
   isPremium,
   userProfile,
   activityLevel,
   userHistory,
   detailedProfile,
   commonVideos,
   skippedUsers,
   lastFilterCost,
   filterAppliedDate,
   viewingTrends,
   commonFriends,
   fetchMatchedUsers,
   fetchPreferences,
   fetchDetailedProfile,
   getCommonVideos: getUserCommonVideos,
   savePreferences,
   handleLike,
   handleSkip,
   handleUndoSkip,
   consumePoints: handleConsumePoints,
   addPoints: handleAddPoints,
   getUserHistory: fetchUserHistory,
   getSkippedUsers,
   undoSkip: handleUndoSkip,
   findSkippedUser,
   restoreSkippedUser,
   nextUser,
   getCurrentUser,
   fetchViewingTrends,
   fetchCommonFriends,
   fetchYouTubeChannelInfo
 };
};

export default useMatching;