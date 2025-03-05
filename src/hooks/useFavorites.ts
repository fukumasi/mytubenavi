// src/hooks/useFavorites.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// 名前付きエクスポートに変更
export function useFavorites(videoId?: string) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const checkFavoriteStatus = useCallback(async () => {
    if (!user || !videoId) {
      setIsFavorite(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (error) {
        console.error('お気に入りステータスの確認エラー:', error);
        return;
      }

      setIsFavorite(!!data);
    } catch (error) {
      console.error('お気に入りステータスの確認エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, videoId]);

  useEffect(() => {
    checkFavoriteStatus();
  }, [checkFavoriteStatus]);

  const toggleFavorite = async () => {
    if (!user || !videoId) return;

    try {
      setIsLoading(true);
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            video_id: videoId,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }
      
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('お気に入りの切り替えエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 全てのお気に入り動画IDs取得用
  const getFavoriteVideoIds = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('video_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('お気に入り動画IDの取得エラー:', error);
        return [];
      }

      return data.map(item => item.video_id);
    } catch (error) {
      console.error('お気に入り動画IDの取得エラー:', error);
      return [];
    }
  }, [user]);

  return { 
    isFavorite, 
    isLoading, 
    toggleFavorite,
    getFavoriteVideoIds,
    refreshStatus: checkFavoriteStatus
  };
}

// 後方互換性のために、デフォルトエクスポートも残す
export default useFavorites;