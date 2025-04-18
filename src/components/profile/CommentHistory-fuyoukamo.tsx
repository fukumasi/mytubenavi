import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileLayout from './ProfileLayout';
import { supabase } from '@/lib/supabase';
import ReviewCard from '@/components/ui/ReviewCard';
import type { Review } from '@/types/review';

export default function ReviewHistory() {
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

        const { data, error } = await supabase
          .from('reviews')
          .select(`
            *,
            profiles (
              id,
              username,
              avatar_url
            ),
            videos (
              title,
              thumbnail
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReviews(data || []);
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
          <h2 className="text-xl font-semibold text-gray-900">レビュー履歴</h2>
          <span className="text-sm text-gray-500">
            {!loading && !error && `${reviews.length}件のレビュー`}
          </span>
        </div>
        {renderContent()}
      </div>
    </ProfileLayout>
  );
}