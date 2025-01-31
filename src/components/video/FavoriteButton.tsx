import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toggleFavorite, getFavoriteStatus } from '../../lib/supabase';

interface FavoriteButtonProps {
  videoId: string;
  onLoginRequired?: () => void;
}

export default function FavoriteButton({ videoId, onLoginRequired }: FavoriteButtonProps) {
  const { currentUser } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!currentUser) return;
      try {
        const status = await getFavoriteStatus(videoId);
        setIsFavorite(status);
      } catch (err) {
        console.error('Error checking favorite status:', err);
      }
    };

    checkFavoriteStatus();
  }, [videoId, currentUser]);

  const handleClick = async () => {
    if (!currentUser) {
      onLoginRequired?.();
      return;
    }

    try {
      setLoading(true);
      const newStatus = await toggleFavorite(videoId);
      setIsFavorite(newStatus);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        inline-flex items-center space-x-1 px-3 py-2 rounded-md
        ${isFavorite
          ? 'text-red-600 hover:text-red-700'
          : 'text-gray-600 hover:text-gray-700'
        }
        disabled:opacity-50 transition-colors duration-200
      `}
    >
      <Heart
        className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`}
      />
      <span className="text-sm font-medium">
        {isFavorite ? 'お気に入り済み' : 'お気に入り'}
      </span>
    </button>
  );
}