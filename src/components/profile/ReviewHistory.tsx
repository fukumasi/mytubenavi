
import { Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Review } from '../../types';

interface ReviewHistoryProps {
  reviews: Review[];
  loading: boolean;
  error: string | null;
}

export default function ReviewHistory({ reviews, loading, error }: ReviewHistoryProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">まだレビューを投稿していません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          onClick={() => navigate(`/video/${review.videoId}`)}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="font-medium">{review.rating}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>{new Date(review.createdAt).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
          </div>
        </div>
      ))}
    </div>
  );
}