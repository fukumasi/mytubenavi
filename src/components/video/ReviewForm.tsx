// src/components/video/ReviewForm.tsx
import { useEffect, useState } from 'react';
import { ThumbsUp, AlertCircle, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getVideoReviews, postReview, updateReview } from '@/lib/supabase';
import { Review } from '@/types';
import { supabase } from '@/lib/supabase';

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
    switch (size) {
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
  onReviewSubmitted: () => Promise<void>;
  existingReview?: Review;
}

export default function ReviewForm({
  videoId,
  onReviewSubmitted,
  existingReview
}: ReviewFormProps) {
  const { user } = useAuth(); // ← 修正ポイント: currentUser → user
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(existingReview?.comment?.length || 0);
  const [hasUserReviewed, setHasUserReviewed] = useState(!!existingReview);

  const MAX_CHARS = 1000;

  useEffect(() => {
    const checkExistingReview = async () => {
      if (user) {
        const reviews = await getVideoReviews(videoId);
        const userReview = reviews.find(review => review.user_id === user.id);
        setHasUserReviewed(!!userReview);
      }
    };
    checkExistingReview();
  }, [videoId, user]);

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
      setError('レビューを入力してください');
      return false;
    }
    if (comment.length < 10) {
      setError('レビューは10文字以上入力してください');
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

      existingReview
        ? await updateReview(existingReview.id, rating, comment.trim())
        : await postReview(videoId, rating, comment.trim());

      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          video_id: videoId,
          user_id: user?.id,
          content: comment.trim(),
          type: 'review',
          created_at: new Date().toISOString()
        });

      if (commentError) {
        console.error('レビュー保存エラー:', commentError);
        throw commentError;
      }

      const { error: updateError } = await supabase
        .rpc('update_video_comment_count', { p_video_id: videoId });

      if (updateError) {
        console.error('レビュー数更新エラー:', updateError);
        throw updateError;
      }

      await onReviewSubmitted();

      if (!existingReview) {
        setRating(0);
        setComment('');
        setCharCount(0);
      }

    } catch (err: any) {
      console.error('レビュー投稿エラー:', err);
      setError(err.message || 'レビューの投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
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
          レビュー
        </label>
        <textarea
          id="comment"
          rows={4}
          value={comment}
          onChange={handleCommentChange}
          className={`w-full rounded-md shadow-sm ${charCount > MAX_CHARS * 0.9
            ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
          placeholder="この動画の感想を書いてください..."
        />
      </div>

      <div className="flex justify-end mb-4">
        <span className={`text-sm ${charCount > MAX_CHARS * 0.9 ? 'text-yellow-600' : 'text-gray-500'}`}>
          {charCount}/{MAX_CHARS}文字
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        <ul className="list-disc list-inside space-y-1">
          <li>投稿したレビューは公開され、他のユーザーが参照できます</li>
          <li>不適切な内容は削除される場合があります</li>
          <li>レビューは10文字以上、{MAX_CHARS}文字以内で入力してください</li>
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
