import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Video, Review } from '../types';

interface DbVideo {
id: string;
title: string;
thumbnail: string;
channel_title: string;
published_at: string;
view_count: number;
rating: number;
duration: string;
}

interface FavoriteRecord {
video: DbVideo;
}

interface HistoryRecord {
video: DbVideo;
}

export function useProfileData() {
const [favoriteVideos, setFavoriteVideos] = useState<Video[]>([]);
const [reviewHistory, setReviewHistory] = useState<Review[]>([]);
const [viewHistory, setViewHistory] = useState<Video[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [
        { data: favorites }, 
        { data: reviews }, 
        { data: history }
      ] = await Promise.all([
        supabase
          .from('favorites')
          .select('video:video_id(*)')
          .eq('user_id', user.id),
        supabase
          .from('reviews')
          .select('*, video:video_id(*)')
          .eq('user_id', user.id),
        supabase
          .from('view_history')
          .select('video:video_id(*)')
          .eq('user_id', user.id)
      ]);

      const parsedFavorites = favorites as unknown as FavoriteRecord[];
      setFavoriteVideos((parsedFavorites || []).map(f => ({
        id: f.video.id,
        youtube_id: f.video.id,
        title: f.video.title,
        description: '',
        thumbnail: f.video.thumbnail,
        duration: f.video.duration,
        view_count: f.video.view_count,
        rating: f.video.rating,
        published_at: f.video.published_at,
        channel_title: f.video.channel_title,
        review_count: 0,
      } as Video)));

      setReviewHistory(reviews ?? []);

      const parsedHistory = history as unknown as HistoryRecord[];
      setViewHistory((parsedHistory || []).map(h => ({
        id: h.video.id,
        youtube_id: h.video.id,
        title: h.video.title,
        description: '',
        thumbnail: h.video.thumbnail,
        duration: h.video.duration,
        view_count: h.video.view_count,
        rating: h.video.rating,
        published_at: h.video.published_at,
        channel_title: h.video.channel_title,
        review_count: 0,
      } as Video)));

    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  fetchProfileData();
}, []);

return {
  favoriteVideos,
  reviewHistory,
  viewHistory,
  loading,
  error,
  refresh: () => setLoading(true)
};
}