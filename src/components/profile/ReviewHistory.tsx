import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileLayout from './ProfileLayout';
import { supabase } from '../../lib/supabase';
import type { Review } from '../../types';

interface ReviewCardProps {
  review: Review;
  onVideoClick: (videoId: string) => void;
}

const ReviewCard = ({ review, onVideoClick }: ReviewCardProps) => {
  if (!review.created_at) return null;

  return (
    <div
      onClick={() => onVideoClick(review.video_id)}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-400" />
            <span className="font-medium">{review.rating}</span>
          </div>
          <span className="text-sm text-gray-500">
            {new Date(review.created_at).toLocaleDateString('ja-JP')}
          </span>
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-3">
          {review.videos?.title || '削除された動画'}
        </h3>
        
        <p className="text-gray-700 whitespace-pre-wrap mb-3">{review.comment}</p>
        
        {review.profiles && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <img
              src={review.profiles.avatar_url || '/default-avatar.jpg'}
              alt={review.profiles.username}
              className="w-6 h-6 rounded-full"
            />
            <span>{review.profiles.username}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ReviewHistory = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('認証されていません');

        // まず reviews を取得
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            *,
            profiles!reviews_user_id_fkey (
              id,
              username,
              avatar_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (reviewsError) throw reviewsError;

        // 次に videos の情報を取得
        if (reviewsData) {
          const videoIds = reviewsData.map(review => review.video_id);
          const { data: videosData, error: videosError } = await supabase
            .from('videos')
            .select('id, title')
            .in('id', videoIds);

          if (videosError) throw videosError;

          // reviews と videos のデータを結合
          const combinedData = reviewsData.map(review => ({
            ...review,
            videos: videosData?.find(video => video.id === review.video_id)
          }));

          setReviews(combinedData);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('レビューの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const handleVideoClick = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-indigo-600 hover:text-indigo-500"
          >
            再読み込み
          </button>
        </div>
      );
    }

    if (reviews.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">まだレビューを投稿していません。</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-indigo-600 hover:text-indigo-500"
          >
            動画を探す
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onVideoClick={handleVideoClick}
          />
        ))}
      </div>
    );
  };

  return (
    <ProfileLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">評価・レビュー履歴</h2>
          <span className="text-sm text-gray-500">
            {!loading && !error && `${reviews.length}件のレビュー`}
          </span>
        </div>
        {renderContent()}
      </div>
    </ProfileLayout>
  );
};

export default ReviewHistory;