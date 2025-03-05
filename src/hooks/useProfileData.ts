import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Video, Review } from '../types';

export function useProfileData() {
  const [favoriteVideos, setFavoriteVideos] = useState<Video[]>([]);
  const [reviewHistory, setReviewHistory] = useState<Review[]>([]);
  const [viewHistory, setViewHistory] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
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
        .eq('user_id', user.id)
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
        .eq('user_id', user.id)
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
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false });

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
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  return {
    favoriteVideos,
    reviewHistory,
    viewHistory,
    loading,
    error,
    refresh: fetchProfileData
  };
}