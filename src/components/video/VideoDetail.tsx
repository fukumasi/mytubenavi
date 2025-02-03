import React, { useEffect, useState } from 'react';
import { ThumbsUp, AlertCircle, Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getVideoReviews, supabase, postReview } from '@/lib/supabase';
import ReviewList from '@/components/review/ReviewList';
import type { Video, Review } from '@/types';
import VideoPlayer from './VideoPlayer';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (newRating: number) => void;
}

function StarRating({
  rating,
  size = 'md',
  interactive = true,
  onRatingChange
}: StarRatingProps) {
  const getStarSize = (size: 'sm' | 'md' | 'lg') => {
    switch(size) {
      case 'sm': return 16;
      case 'lg': return 24;
      default: return 20;
    }
  };

  const starSize = getStarSize(size);

  return (
    <div className="flex space-x-1">
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          size={starSize}
          className={`${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
            ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={() => interactive && onRatingChange && onRatingChange(index + 1)}
        />
      ))}
    </div>
  );
}

interface ReviewFormProps {
  videoId: string;
  onReviewSubmitted: (rating: number, comment: string) => Promise<void>;
  existingReview?: Review;
}

function ReviewForm({ videoId, onReviewSubmitted, existingReview }: ReviewFormProps) {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(existingReview?.comment?.length || 0);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  const MAX_CHARS = 1000;

  useEffect(() => {
    const checkExistingReview = async () => {
      if (currentUser) {
        const reviews = await getVideoReviews(videoId);
        const userReview = reviews.find(review => review.user_id === currentUser.id);
        setHasUserReviewed(!!userReview);
      }
    };
    checkExistingReview();
  }, [videoId, currentUser]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_CHARS) {
      setComment(text);
      setCharCount(text.length);
    }
  };

  const validateForm = () => {
    if (!rating) {
      setError('評価を選択してください');
      return false;
    }
    if (!comment.trim()) {
      setError('コメントを入力してください');
      return false;
    }
    if (comment.length < 10) {
      setError('コメントは10文字以上入力してください');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setError(null);
      setLoading(true);

      await postReview(videoId, rating, comment.trim());
      setRating(0);
      setComment('');
      setCharCount(0);
      await onReviewSubmitted(rating, comment.trim());

    } catch (err: any) {
      console.error('Review submission error:', err);
      if (err.message.includes('already reviewed')) {
        setError('この動画にはすでにレビューを投稿済みです');
      } else {
        setError('レビューの投稿に失敗しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            レビューを投稿するにはログインが必要です
          </h3>
          <div className="space-x-4">
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              ログイン
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              新規登録
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (hasUserReviewed && !existingReview) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-600">
          この動画にはすでにレビューを投稿済みです
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {existingReview ? 'レビューを編集' : 'レビューを投稿'}
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          評価
        </label>
        <StarRating
          rating={rating}
          onRatingChange={setRating}
        />
      </div>

      <div className="mb-2">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          コメント
        </label>
        <textarea
          id="comment"
          rows={4}
          value={comment}
          onChange={handleCommentChange}
           className={`w-full rounded-md shadow-sm ${
            charCount > MAX_CHARS * 0.9
              ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="この動画の感想を書いてください..."
        />
      </div>

      <div className="flex justify-end mb-4">
        <span className={`text-sm ${
          charCount > MAX_CHARS * 0.9 ? 'text-yellow-600' : 'text-gray-500'
        }`}>
          {charCount}/{MAX_CHARS}文字
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        <ul className="list-disc list-inside space-y-1">
          <li>投稿したレビューは公開され、他のユーザーが参照できます</li>
          <li>不適切な内容は削除される場合があります</li>
          <li>コメントは10文字以上、{MAX_CHARS}文字以内で入力してください</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              投稿中...
            </>
          ) : (
            <>
              <ThumbsUp className="w-4 h-4 mr-1.5" />
              {existingReview ? '更新する' : 'レビューを投稿'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function VideoDetail() {
  const { videoId } = useParams();
  const { currentUser } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideoAndReviews = async () => {
      if (videoId) {
        try {
          setLoading(true);

          const { data: videoData, error: videoError } = await supabase
            .from('videos')
            .select('*')
            .eq('youtube_id', videoId)
            .single();

          if (videoError) throw videoError;
          if (!videoData) throw new Error('Video not found');

          setVideo({
            ...videoData,
            youtubeId: videoData.youtube_id,
            viewCount: videoData.view_count,
            publishedAt: videoData.published_at,
              youtube_id: videoData.youtube_id, // この行を追加
          });


          const reviewsData = await getVideoReviews(videoId);
          setReviews(reviewsData);

        } catch (err) {
          console.error('Error fetching video details:', err);
          setError('動画の読み込みに失敗しました。');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchVideoAndReviews();
  }, [videoId]);

  const handleReviewSubmit = async () => {
    if (videoId) {
      const updatedReviews = await getVideoReviews(videoId);
      setReviews(updatedReviews);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600">{error || '動画が見つかりませんでした。'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* 動画プレーヤーセクション */}
        <div className="w-full relative pt-[56.25%]">
              <div className="absolute top-0 left-0 w-full h-full">
              <VideoPlayer
                videoId={video.youtube_id}
                width="100%"
                height="100%"
              />
            </div>
        </div>

        {/* 動画情報セクション */}
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
          <div className="text-gray-600 mb-4">
            <p>{video.viewCount?.toLocaleString() || 0} 回視聴</p>
            <p>投稿日: {new Date(video.publishedAt).toLocaleDateString()}</p>
          </div>
          {video.description && (
            <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
          )}
        </div>

        {/* レビューセクション */}
        <div className="p-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-6">レビュー</h2>

          {currentUser && (
            <ReviewForm
              videoId={videoId!}
              onReviewSubmitted={handleReviewSubmit}
              existingReview={reviews.find(review => review.user_id === currentUser.id)}
            />
          )}

          {/* レビュー一覧 */}
          <div className="mt-8">
            <ReviewList reviews={reviews} />
          </div>
        </div>
      </div>
    </div>
  );
}