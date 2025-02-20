import { useState } from 'react';
import { VideoRating } from '@/types';
import { getVideoRating, submitVideoRating } from '@/lib/supabase';

export function useVideoRating(videoId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<VideoRating | null>(null);

  const fetchRating = async () => {
    try {
      setLoading(true);
      const data = await getVideoRating(videoId);
      setRating(data);
      setError(null);
    } catch (err) {
      setError('評価の取得に失敗しました');
      console.error('Error fetching rating:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async (
    overall: number,
    clarity: number,
    entertainment: number,
    originality: number,
    quality: number,
    reliability: number,
    usefulness: number,
    comment: string
  ) => {
    try {
      setLoading(true);
      await submitVideoRating(
        videoId,
        overall,
        clarity,
        entertainment,
        originality,
        quality,
        reliability,
        usefulness,
        comment
      );
      await fetchRating();
      setError(null);
    } catch (err) {
      setError('評価の送信に失敗しました');
      console.error('Error submitting rating:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    rating,
    loading,
    error,
    fetchRating,
    submitRating
  };
}