import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
}

export function StarRating({
  rating,
  onRatingChange,
  readOnly = false,
  size = 'md',
  editable = true
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const getStarSize = (size: 'sm' | 'md' | 'lg'): number => {
    switch (size) {
      case 'sm': return 16;
      case 'lg': return 24;
      default: return 20;
    }
  };

  const getFontSize = (size: 'sm' | 'md' | 'lg'): string => {
    switch (size) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };

  const handleClick = (selectedRating: number) => {
    if (!readOnly && editable && onRatingChange) {
      onRatingChange(selectedRating === rating ? 0 : selectedRating);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (!readOnly && editable) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly && editable) {
      setHoverRating(0);
    }
  };

  const renderStars = () => {
    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      const isActive = starValue <= (hoverRating || rating);
      
      return (
        <button
          key={starValue}
          type="button"
          onClick={() => handleClick(starValue)}
          onMouseEnter={() => handleMouseEnter(starValue)}
          className={`
            ${!readOnly && editable ? 'cursor-pointer group' : 'cursor-default'}
            p-0.5 -m-0.5 rounded-full
            ${!readOnly && editable && 'hover:bg-gray-100'}
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
          `}
          disabled={readOnly || !editable}
          title={`${starValue}点`}
          aria-label={`${starValue}点${isActive ? '（選択中）' : ''}`}
        >
          <Star
            size={getStarSize(size)}
            className={`
              ${isActive ? 'text-yellow-400' : 'text-gray-300'}
              ${!readOnly && editable && 'group-hover:scale-110'}
              transition-all duration-200
            `}
            fill={isActive ? 'currentColor' : 'none'}
            strokeWidth={2}
          />
        </button>
      );
    });
  };

  return (
    <div 
      className="flex items-center space-x-1" 
      onMouseLeave={handleMouseLeave}
      role="group"
      aria-label="星評価"
    >
      {renderStars()}
      {!readOnly && editable && (
        <span className={`ml-2 ${getFontSize(size)} text-gray-500`}>
          {rating > 0 ? `${rating}点` : '評価を選択'}
        </span>
      )}
    </div>
  );
}

export default StarRating;