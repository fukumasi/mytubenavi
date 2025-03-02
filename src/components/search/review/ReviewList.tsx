// src/components/review/ReviewList.tsx

import { User, ThumbsUp, Pencil, Trash2 } from 'lucide-react';
import type { Review } from '@/types/review';
import { StarRating } from './StarRating';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  videoId?: string;
}

const ReviewList = ({ 
  reviews = [], 
  currentUserId,
  onEdit,
  onDelete,
  videoId
}: ReviewListProps) => {
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});

  const fetchHelpfulCounts = async () => {
    if (reviews.length === 0) return;

    const { data, error } = await supabase
      .from('helpful_reviews')
      .select('review_id, count')
      .in('review_id', reviews.map(r => r.id));

    if (!error && data) {
      const counts = data.reduce((acc: Record<string, number>, item: { review_id: string, count: number }) => {
        acc[item.review_id] = item.count;
        return acc;
      }, {});
      setHelpfulCounts(counts);
    }
  };

  useEffect(() => {
    fetchHelpfulCounts();
  }, [reviews]);

  const handleDelete = async (reviewId: string) => {
    if (window.confirm('このレビューを削除してもよろしいですか？')) {
      try {
        const { error } = await supabase
          .from('reviews')
          .delete()
          .match({ id: reviewId, user_id: currentUserId });

        if (error) throw error;
        onDelete?.(reviewId);
      } catch (error) {
        console.error('レビューの削除中にエラーが発生しました:', error);
        alert('レビューの削除に失敗しました。');
      }
    }
  };

  const handleHelpful = async (reviewId: string) => {
    if (!currentUserId) {
      alert('「役に立った」を評価するにはログインが必要です。');
      return;
    }

    try {
      const newHelpfulReviews = new Set(helpfulReviews);
      
      if (helpfulReviews.has(reviewId)) {
        const { error } = await supabase
          .from('helpful_reviews')
          .delete()
          .match({ 
            review_id: reviewId, 
            user_id: currentUserId 
          });

        if (error) throw error;
        newHelpfulReviews.delete(reviewId);
        setHelpfulCounts(prev => ({
          ...prev,
          [reviewId]: (prev[reviewId] || 1) - 1
        }));
      } else {
        const { error } = await supabase
          .from('helpful_reviews')
          .insert({ 
            review_id: reviewId, 
            user_id: currentUserId,
            video_id: videoId
          });

        if (error) throw error;
        newHelpfulReviews.add(reviewId);
        setHelpfulCounts(prev => ({
          ...prev,
          [reviewId]: (prev[reviewId] || 0) + 1
        }));
      }

      setHelpfulReviews(newHelpfulReviews);
    } catch (error) {
      console.error('「役に立った」の更新中にエラーが発生しました:', error);
      alert('評価の更新に失敗しました。');
    }
  };

  if (!reviews?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        まだレビューはありません。最初のレビューを投稿してみましょう！
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {review.profiles?.avatar_url ? (
                  <img
                    src={review.profiles.avatar_url}
                    alt={review.profiles.username || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">
                  {review.profiles?.username || 'ゲスト'}
                </div>
                {review.rating && (
                  <StarRating 
                    rating={review.rating} 
                    size="sm" 
                    readOnly={true}
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-500">
                {review.created_at && new Date(review.created_at).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              {currentUserId === review.user_id && (
                <div className="flex space-x-1">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(review)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      title="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3">
            {review.content}
          </div>
          
          <div className="flex items-center">
            <button 
              onClick={() => handleHelpful(review.id)}
              className={`flex items-center space-x-1 text-xs transition-colors ${
                helpfulReviews.has(review.id)
                  ? 'text-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label="役に立った"
            >
              <ThumbsUp className="w-3 h-3" />
              <span>役に立った {helpfulCounts[review.id] || 0}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReviewList;