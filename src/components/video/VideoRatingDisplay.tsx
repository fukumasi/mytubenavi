import React, { useEffect, useState } from 'react';
import { useVideoRating } from '@/hooks/useVideoRating';
import { StarRating } from '../search/review/StarRating';
import { HelpCircle } from 'lucide-react';
import { RatingCategory } from '@/types';

const RATING_CATEGORY_LABELS: Record<RatingCategory, string> = {
  reliability: '信頼性',
  entertainment: '面白さ',
  usefulness: '有用性',
  quality: '品質',
  originality: 'オリジナリティ',
  clarity: '分かりやすさ',
  overall: '総合評価'
};

interface VideoRatingDisplayProps {
  videoId: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDetailedRatings?: boolean;
  animate?: boolean;
}

export const VideoRatingDisplay: React.FC<VideoRatingDisplayProps> = ({
  videoId,
  showCount = true,
  size = 'md',
  className = '',
  showDetailedRatings = false,
  animate = false
}) => {
  const { averageRating, reviewCount, detailedRatings, isLoading, error } = useVideoRating(videoId);
  const [tooltipCategory, setTooltipCategory] = useState<RatingCategory | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(animate);

  // サイズ設定
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // const starSizes = {  <= 削除
  //   sm: 'w-3 h-3',
  //   md: 'w-4 h-4',
  //   lg: 'w-5 h-5',
  // };

  // アニメーション効果
  useEffect(() => {
    if (animate && !isLoading && averageRating !== null && averageRating > 0) {
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [animate, isLoading, averageRating]);

  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} ${className} animate-pulse bg-gray-200 h-5 w-28 rounded`}></div>
    );
  }

  if (error) {
    return (
      <div className={`${sizeClasses[size]} ${className} text-red-500`}>
        評価を読み込めませんでした
      </div>
    );
  }

  const hasRatings = averageRating !== null && averageRating > 0;

  const renderCategoryRating = (category: RatingCategory, rating: number) => (
    <div key={category} className="flex items-center justify-between py-1">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700 min-w-[5rem]">
          {RATING_CATEGORY_LABELS[category]}
        </span>
        <div
          onMouseEnter={() => setTooltipCategory(category)}
          onMouseLeave={() => setTooltipCategory(null)}
          className="relative"
        >
          {category !== 'overall' && (
            <HelpCircle className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
          )}
          {tooltipCategory === category && category !== 'overall' && (
            <div className="absolute z-10 left-full ml-2 w-36 p-2 bg-black text-white text-xs rounded shadow-lg">
              {category}の評価
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <StarRating
          rating={rating}
          readOnly
          size="sm"
          showNumber
        />
      </div>
    </div>
  );

  return (
    <div className={`${className}`}>
      <div className={`flex items-center ${sizeClasses[size]}`}>
        <div className={`flex mr-1 ${shouldAnimate ? 'animate-pulse' : ''}`}>
          <StarRating
            rating={averageRating || 0}
            readOnly
            size={size}
            showNumber={false}
          />
        </div>
        {showCount && (
          <div className="flex items-center">
            <span className="ml-1 text-gray-600">
              {hasRatings ? averageRating.toFixed(1) : '-'}
            </span>
            <span className="mx-1 text-gray-400">|</span>
            <span className="text-gray-600">
              {reviewCount > 0 ? `${reviewCount}件のレビュー` : 'レビューなし'}
            </span>
            {showDetailedRatings && detailedRatings && (Object.keys(detailedRatings).length > 0) && (
              <button
                type="button"
                className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "詳細評価を閉じる" : "詳細評価を表示"}
              >
                {isExpanded ? "閉じる" : "詳細"}
              </button>
            )}
          </div>
        )}
      </div>

      {showDetailedRatings && isExpanded && detailedRatings && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">評価詳細</h4>
          <div>
            {renderCategoryRating('overall', detailedRatings.overall || 0)}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200">
              {['reliability', 'entertainment', 'usefulness', 'quality', 'originality', 'clarity'].map(
                category => renderCategoryRating(category as RatingCategory, detailedRatings[category as RatingCategory] || 0)
              )}
            </div>
          </div>
        </div>
      )}

      {!hasRatings && !isLoading && (
        <div className="mt-1 text-gray-500 text-xs">
          この動画にはまだ評価がありません。最初の評価者になりませんか？
        </div>
      )}
    </div>
  );
};

export default VideoRatingDisplay;