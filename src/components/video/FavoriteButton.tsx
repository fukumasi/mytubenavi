import React from 'react';
import { Star } from 'lucide-react';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuth } from '../../contexts/AuthContext';

interface FavoriteButtonProps {
  videoId: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ videoId }) => {
  const { currentUser } = useAuth();
  const { isFavorite, isLoading, toggleFavorite } = useFavorites(videoId);

  const handleClick = () => {
    if (!currentUser) {
      alert('お気に入り機能を使用するにはログインしてください。');
      return;
    }
    toggleFavorite();
  };

  if (isLoading) {
    return <div className="animate-pulse w-8 h-8 bg-gray-200 rounded-full" />;
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
        isFavorite
          ? 'bg-yellow-400 text-white hover:bg-yellow-500'
          : 'bg-gray-100 hover:bg-gray-200'
      }`}
    >
      <Star className={isFavorite ? 'fill-current' : ''} size={20} />
      <span>{isFavorite ? 'お気に入り済み' : 'お気に入り'}</span>
    </button>
  );
};

export default FavoriteButton;