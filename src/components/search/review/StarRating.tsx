// src/components/search/review/StarRating.tsx
import { useState } from 'react';
import { Star } from 'lucide-react';
import type { RatingValue } from '@/types/rating';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: RatingValue) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  className?: string;
  colorScheme?: 'yellow' | 'blue' | 'primary' | 'gold';
  label?: string;
}

export function StarRating({
  rating,
  onRatingChange,
  readOnly = false,
  size = 'md',
  showNumber = false,
  className = '',
  colorScheme = 'yellow',
  label
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const getStarSize = (size: 'sm' | 'md' | 'lg'): number => {
    switch (size) {
      case 'sm': return 14;
      case 'lg': return 24;
      default: return 18;
    }
  };

  const getStarGap = (size: 'sm' | 'md' | 'lg'): string => {
    switch (size) {
      case 'sm': return 'gap-0.5';
      case 'lg': return 'gap-2';
      default: return 'gap-1';
    }
  };

  const getFontSize = (size: 'sm' | 'md' | 'lg'): string => {
    switch (size) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };

  const getColorScheme = (scheme: 'yellow' | 'blue' | 'primary' | 'gold'): {
    active: string;
    inactive: string;
  } => {
    switch (scheme) {
      case 'blue':
        return {
          active: 'text-blue-500',
          inactive: 'text-gray-200'
        };
      case 'primary':
        return {
          active: 'text-primary-500',
          inactive: 'text-gray-200'
        };
      case 'gold':
        return {
          active: 'text-amber-500',
          inactive: 'text-gray-200'
        };
      case 'yellow':
      default:
        return {
          active: 'text-yellow-400',
          inactive: 'text-gray-200'
        };
    }
  };

  const handleClick = (selectedRating: number) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(selectedRating as RatingValue);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (!readOnly) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };

  const colors = getColorScheme(colorScheme);

  const renderStars = () => {
    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      const currentRating = hoverRating || rating;
      const isActive = starValue <= Math.floor(currentRating);
      const isPartiallyFilled = !isActive && starValue === Math.ceil(currentRating) && currentRating % 1 !== 0;
      
      // 部分的に塗りつぶす割合の計算
      const fillPercentage = isPartiallyFilled 
        ? (currentRating % 1) * 100 
        : 0;
      
      return (
        <div
          key={starValue}
          className="relative inline-block"
          style={{ width: `${getStarSize(size)}px`, height: `${getStarSize(size)}px` }}
        >
          <button
            type="button"
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClick(starValue);
              }
            }}
            className={`
              ${!readOnly ? 'cursor-pointer group' : 'cursor-default'}
              absolute inset-0 z-10
              ${!readOnly && 'hover:scale-110'}
              transition-transform duration-200 ease-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1
              disabled:opacity-50
              flex items-center justify-center
            `}
            disabled={readOnly}
            title={`${starValue}点`}
            aria-label={`${starValue}点${(isActive || isPartiallyFilled) ? '（選択中）' : ''}`}
            aria-pressed={isActive || isPartiallyFilled}
            tabIndex={readOnly ? -1 : 0}
          >
            <Star
              size={getStarSize(size)}
              className={`${isActive || isPartiallyFilled ? colors.active : colors.inactive}`}
              fill={isActive ? 'currentColor' : 'none'}
              strokeWidth={1.5}
            />
          </button>
          
          {/* 部分的に塗りつぶされた星 */}
          {isPartiallyFilled && (
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${fillPercentage}%` }}
            >
              <Star
                size={getStarSize(size)}
                className={colors.active}
                fill="currentColor"
                strokeWidth={1.5}
              />
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div 
      className={`inline-flex items-center ${getStarGap(size)} ${className}`}
      onMouseLeave={handleMouseLeave}
      role="group"
      aria-label={label || `星評価: ${rating}点`}
    >
      {renderStars()}
      {showNumber && (
        <span className={`${getFontSize(size)} text-gray-600 font-medium ml-1.5`}>
          {rating > 0 ? rating.toFixed(1) : readOnly ? '-' : '評価なし'}
        </span>
      )}
    </div>
  );
}

export default StarRating;