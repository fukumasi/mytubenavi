import React, { useState, useEffect } from 'react';
import { AlertCircle, ThumbsUp, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { postReview, updateReview, deleteReview, getVideoReviews } from '@/lib/supabase';
import { StarRating } from './StarRating';
import type { Review } from '@/types';

interface ReviewFormProps {
  videoId: string;
  onReviewSubmitted: (rating: number, comment: string) => Promise<void>;
  existingReview?: Review;
  onCancel?: () => void;
  onDelete?: () => void;
}

export function ReviewForm({ 
  videoId, 
  onReviewSubmitted, 
  existingReview,
  onCancel,
  onDelete 
}: ReviewFormProps) {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(existingReview?.comment?.length || 0);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const MAX_CHARS = 1000;
  const MIN_CHARS = 10;

  useEffect(() => {
    const checkExistingReview = async () => {
      if (currentUser) {
        try {
          const reviews = await getVideoReviews(videoId);
          const userReview = reviews.find(review => review.user_id === currentUser.id);
          setHasUserReviewed(!!userReview);
        } catch (err) {
          console.error('Error checking existing review:', err);
          setError('レビュー情報の取得に失敗しました');
        }
      }
    };
    
    if (!existingReview) {
      checkExistingReview();
    }
  }, [videoId, currentUser, existingReview]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_CHARS) {
      setComment(text);
      setCharCount(text.length);
      if (error) setError(null);
    }
  };

  const handleDelete = async () => {
    if (!existingReview) return;
    
    try {
      setLoading(true);
      await deleteReview(existingReview.id);
      onDelete?.();
    } catch (err) {
      console.error('Error deleting review:', err);
      setError('レビューの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!rating) {
      setError('評価を選択してください');
      return false;
    }
    
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      setError('コメントを入力してください');
      return false;
    }
    
    if (trimmedComment.length < MIN_CHARS) {
      setError(`コメントは${MIN_CHARS}文字以上入力してください`);
      return false;
    }
    
    if (trimmedComment.length > MAX_CHARS) {
      setError(`コメントは${MAX_CHARS}文字以内で入力してください`);
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

      if (existingReview) {
        await updateReview(existingReview.id, rating, comment.trim());
      } else {
        await postReview(videoId, rating, comment.trim());
      }

      setSubmitSuccess(true);
      await onReviewSubmitted(rating, comment.trim());

      if (!existingReview) {
        setTimeout(() => {
          setHasUserReviewed(true);
        }, 2000);
      }

    } catch (err: any) {
      console.error('Review submission error:', err);
      setError(err.message || 'レビューの投稿に失敗しました。もう一度お試しください。');
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
      {submitSuccess ? (
        <div className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-md">
          <ThumbsUp className="w-5 h-5 mr-2" />
          レビューを{existingReview ? '更新' : '投稿'}しました
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {existingReview ? 'レビューを編集' : 'レビューを投稿'}
            </h3>
            {existingReview && !deleteConfirm && (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {deleteConfirm && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 mb-3">このレビューを削除してもよろしいですか？</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                >
                  削除する
                </button>
              </div>
            </div>
          )}

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
              onRatingChange={(newRating) => {
                setRating(newRating);
                if (error) setError(null);
              }}
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
              <li>コメントは{MIN_CHARS}文字以上、{MAX_CHARS}文字以内で入力してください</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                キャンセル
              </button>
            )}
            
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
        </>
      )}
    </form>
  );
}

export default ReviewForm;