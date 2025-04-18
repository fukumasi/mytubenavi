import React from 'react';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import type { Review } from '@/types/review';

interface ReviewCardProps {
  review: Review;
  onVideoClick?: (videoId: string) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onVideoClick }) => {
  if (!review.created_at) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
      {review.videos && (
        <div 
          onClick={() => onVideoClick?.(review.video_id)}
          className="flex items-center space-x-3 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
        >
          <img
            src={review.videos.thumbnail}
            alt={review.videos.title}
            className="w-24 h-16 object-cover rounded"
          />
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
            {review.videos.title}
          </h3>
        </div>
      )}

      <div className="flex items-start space-x-3">
        {review.profiles?.avatar_url && (
          <img
            src={review.profiles.avatar_url}
            alt={review.profiles.username}
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {review.profiles?.username}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(review.created_at).toLocaleDateString('ja-JP')}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{review.content}</p>
          
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            {review.likes_count !== undefined && review.likes_count > 0 && (
              <div className="flex items-center space-x-1">
                <ThumbsUp className="w-4 h-4" />
                <span>{review.likes_count}</span>
              </div>
            )}
            {review.child_reviews_count !== undefined && review.child_reviews_count > 0 && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="w-4 h-4" />
                <span>{review.child_reviews_count}件の返信</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;