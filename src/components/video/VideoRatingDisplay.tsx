import React from 'react';
import { AggregatedVideoRating, RatingCategory, VideoRating } from '@/types';
import { StarRating } from '../review/StarRating';

const defaultRatings: AggregatedVideoRating = {
  reliability: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  entertainment: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  usefulness: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  quality: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  originality: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  clarity: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  overall: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
};

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
  ratings: AggregatedVideoRating;
  showDetails?: boolean;
  userRatings?: VideoRating[];
  allRatings?: VideoRating[];
  className?: string;
}

const VideoRatingDisplay: React.FC<VideoRatingDisplayProps> = ({
  ratings = defaultRatings,
  showDetails = false,
  userRatings = [],
  allRatings = [],
  className = ''
}) => {
  const renderRatingItem = (category: RatingCategory) => {
    const ratingData = ratings[category];
   
    if (!ratingData || typeof ratingData.averageRating === 'undefined') {
      return null;
    }

    const isOverall = category === 'overall';

    return (
      <div
        key={category}
        className={`
          flex items-center justify-between 
          ${isOverall ? 'mt-4 pt-4 border-t border-gray-200' : 'py-1.5'}
        `}
      >
        <span className={`text-gray-700 min-w-[5rem] ${
          isOverall ? 'text-base font-bold' : 'text-sm'
        }`}>
          {RATING_CATEGORY_LABELS[category]}
        </span>
       
        <div className="flex items-center">
          <StarRating 
            rating={ratingData.averageRating} 
            readOnly
            size={isOverall ? "md" : "sm"}
            showNumber={false}
          />
          <span className={`ml-2 ${
            isOverall ? 'text-base font-bold' : 'text-sm'
          } text-gray-700`}>
            {ratingData.averageRating.toFixed(1)}
          </span>
          {showDetails && ratingData.totalRatings > 0 && (
            <span className="text-xs text-gray-500 ml-2">
              ({ratingData.totalRatings}件)
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderUserRating = (rating: VideoRating, index: number) => (
    <div key={rating.id || index} className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <img 
            src={rating.profiles?.avatar_url || '/default-avatar.png'} 
            alt="" 
            className="w-8 h-8 rounded-full"
          />
          <span className="font-medium">{rating.profiles?.username || '匿名ユーザー'}</span>
        </div>
        <div className="space-y-1">
          {(Object.keys(RATING_CATEGORY_LABELS) as RatingCategory[])
            .filter(category => category !== 'overall')
            .map(category => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{RATING_CATEGORY_LABELS[category]}</span>
                <StarRating 
                  rating={rating[category]} 
                  readOnly 
                  size="sm" 
                  showNumber={false} 
                />
              </div>
            ))}
        </div>
      </div>
      {rating.comment && (
        <div className="text-sm text-gray-700">
          {rating.comment}
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      <div className="space-y-0.5">
        {(Object.keys(RATING_CATEGORY_LABELS) as RatingCategory[])
          .filter(category => category !== 'overall')
          .map(renderRatingItem)}
        {renderRatingItem('overall')}
      </div>

      {userRatings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">あなたの評価</h3>
          <div className="space-y-4">
            {userRatings.map(renderUserRating)}
          </div>
        </div>
      )}

      {allRatings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">全ての評価</h3>
          <div className="space-y-4">
            {allRatings.map(renderUserRating)}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRatingDisplay;