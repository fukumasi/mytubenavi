import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useFavorites = (videoId: string | undefined) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!currentUser) {
        setIsFavorite(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('favorites')
          .select()
          .eq('user_id', currentUser.id)
          .eq('video_id', videoId)
          .single();

        setIsFavorite(!!data);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFavoriteStatus();
  }, [currentUser, videoId]);

  const toggleFavorite = async () => {
    if (!currentUser) return;

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('video_id', videoId);
      } else {
        await supabase
          .from('favorites')
          .insert([{
            user_id: currentUser.id,
            video_id: videoId,
            created_at: new Date().toISOString()
          }]);
      }
      
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return { isFavorite, isLoading, toggleFavorite };
};