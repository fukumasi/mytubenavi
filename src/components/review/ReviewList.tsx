import { User, ThumbsUp, Pencil, Trash2 } from 'lucide-react';
import type { Review } from '@/types';
import { StarRating } from './StarRating';

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
}

export function ReviewList({ 
  reviews = [], 
  currentUserId,
  onEdit,
  onDelete
}: ReviewListProps) {
  const handleDelete = async (reviewId: string) => {
    if (window.confirm('このレビューを削除してもよろしいですか？')) {
      onDelete?.(reviewId);
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
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {review.profiles?.avatarUrl ? (
                  <img
                    src={review.profiles.avatarUrl}
                    alt={review.profiles.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {review.profiles?.username || 'ゲスト'}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <StarRating rating={review.rating} size="sm" editable={false} />
              {currentUserId === review.userId && (
                <div className="flex space-x-2">
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
          
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap break-words">
              {review.comment}
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4">
            <button 
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="役に立った"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>役に立った</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReviewList;