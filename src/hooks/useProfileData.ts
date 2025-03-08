import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Video, Review } from '../types';

interface ProfileData {
  id: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  is_premium?: boolean;
  premium_expires_at?: string | null;
  premium_tier?: string;
  created_at: string;
  updated_at: string;
}

export function useProfileData() {
  const { user, updatePremiumStatus } = useAuth();
  const [favoriteVideos, setFavoriteVideos] = useState<Video[]>([]);
  const [reviewHistory, setReviewHistory] = useState<Review[]>([]);
  const [viewHistory, setViewHistory] = useState<Video[]>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      // プロフィール情報の取得（プレミアム情報を含む）
      const { data: profileDetails, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          username,
          avatar_url,
          bio,
          is_premium,
          premium_expires_at,
          premium_tier,
          created_at,
          updated_at
        `)
        .eq('user_id', authUser.id)
        .single();

      if (profileError) {
        if (profileError.code !== 'PGRST116') { // 見つからないエラーでなければスロー
          throw profileError;
        }
      } else {
        setProfileData(profileDetails);
        
        // AuthContextのプレミアムステータスを更新
        const isPremium = !!profileDetails.is_premium;
        const expiresAt = profileDetails.premium_expires_at 
          ? new Date(profileDetails.premium_expires_at)
          : null;
          
        // 有効期限切れの確認
        const isExpired = expiresAt && expiresAt < new Date();
        
        // プレミアム有効期限が切れている場合は、プレミアムステータスを更新
        if (isPremium && isExpired) {
          await updatePremiumStatus(false);
        } else if (updatePremiumStatus) {
          await updatePremiumStatus(isPremium && !isExpired);
        }
      }

      // お気に入り動画の取得
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select(`
          *,
          video:videos (
            id,
            title,
            thumbnail,
            channel_title,
            published_at,
            view_count,
            rating,
            duration
          )
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (favoritesError) throw favoritesError;

      const validFavorites = favoritesData
        ?.map(fav => fav.video)
        .filter(Boolean)
        .map(video => ({
          id: video.id,
          youtube_id: video.id, // 必須フィールド
          title: video.title,
          description: '', // 必須フィールド
          thumbnail: video.thumbnail,
          channel_title: video.channel_title,
          published_at: video.published_at,
          view_count: video.view_count,
          rating: video.rating,
          duration: video.duration,
          review_count: 0 // 必須フィールド
        })) || [];

      setFavoriteVideos(validFavorites);

      // レビュー履歴の取得
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          ),
          videos (
            id,
            title,
            thumbnail,
            channel_title
          )
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviewHistory(reviewsData || []);

      // 視聴履歴の取得
      const { data: historyData, error: historyError } = await supabase
        .from('view_history')
        .select(`
          *,
          videos (
            id,
            title,
            thumbnail,
            channel_title,
            published_at,
            view_count,
            rating,
            duration
          )
        `)
        .eq('user_id', authUser.id)
        .order('viewed_at', { ascending: false })
        .limit(profileDetails?.is_premium ? 50 : 20); // プレミアム会員は履歴を多く取得

      if (historyError) throw historyError;

      const validHistory = historyData
        ?.filter(history => history.videos)
        .map(history => ({
          id: history.videos.id,
          youtube_id: history.videos.id, // 必須フィールド
          title: history.videos.title,
          description: '', // 必須フィールド
          thumbnail: history.videos.thumbnail,
          channel_title: history.videos.channel_title,
          published_at: history.viewed_at, // 視聴日時を使用
          view_count: history.videos.view_count,
          rating: history.videos.rating,
          duration: history.videos.duration,
          review_count: 0 // 必須フィールド
        })) || [];

      setViewHistory(validHistory);

    } catch (err) {
      console.error('プロフィールデータの取得に失敗:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [updatePremiumStatus]);

  // プレミアム会員ステータスの更新関数
  const updatePremiumMembership = useCallback(async (
    isPremium: boolean, 
    tier: string = 'standard', 
    durationMonths: number = 1
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('ログインが必要です');
      }

      // 有効期限の計算
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(now.getMonth() + durationMonths);

      // プロフィールテーブルのプレミアム情報を更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_premium: isPremium,
          premium_tier: tier,
          premium_expires_at: isPremium ? expiresAt.toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // AuthContextのプレミアム状態を更新
      if (updatePremiumStatus) {
        await updatePremiumStatus(isPremium);
      }

      // プロフィールデータを再取得
      await fetchProfileData();

      return {
        success: true,
        message: isPremium 
          ? 'プレミアム会員に登録しました'
          : 'プレミアム会員を解除しました'
      };
    } catch (err) {
      console.error('プレミアム会員情報の更新に失敗:', err);
      const errorMessage = err instanceof Error ? err.message : '予期せぬエラーが発生しました';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, updatePremiumStatus, fetchProfileData]);

  // プレミアム会員ステータスの確認関数
  const checkPremiumStatus = useCallback(async () => {
    if (!profileData) return false;
    
    // プレミアム会員でない場合
    if (!profileData.is_premium) return false;
    
    // 有効期限をチェック
    if (profileData.premium_expires_at) {
      const expiresAt = new Date(profileData.premium_expires_at);
      if (expiresAt < new Date()) {
        // 有効期限切れの場合はステータスを更新
        await updatePremiumMembership(false);
        return false;
      }
    }
    
    return true;
  }, [profileData, updatePremiumMembership]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  return {
    favoriteVideos,
    reviewHistory,
    viewHistory,
    profileData,
    loading,
    error,
    refresh: fetchProfileData,
    updatePremiumMembership,
    checkPremiumStatus,
    isPremium: profileData?.is_premium || false,
    premiumTier: profileData?.premium_tier || null,
    premiumExpiresAt: profileData?.premium_expires_at || null
  };
}