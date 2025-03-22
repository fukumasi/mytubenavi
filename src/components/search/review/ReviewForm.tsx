// src/components/search/review/ReviewForm.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, ThumbsUp, Trash2, RefreshCw, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StarRating } from './StarRating';
import type { Review } from '@/types/review';

interface ReviewFormProps {
  videoId: string;
  onReviewSubmitted?: (rating: number, content: string) => Promise<void>;
  existingReview?: Review;
  onCancel?: () => void;
  onDelete?: () => void;
  className?: string;
  redirectAfterSubmit?: boolean;
  detailedRating?: boolean;
  showGuidelines?: boolean;
  title?: string;
}

// 詳細評価のカテゴリ
interface RatingCategory {
  id: string;
  label: string;
  description: string;
}

// 各カテゴリの評価値を保持するオブジェクト
interface DetailedRatings {
  overall: number;
  clarity: number;
  entertainment: number;
  originality: number;
  quality: number;
  reliability: number;
  usefulness: number;
}

const DEFAULT_DETAILED_RATINGS: DetailedRatings = {
  overall: 0,
  clarity: 0,
  entertainment: 0,
  originality: 0,
  quality: 0,
  reliability: 0,
  usefulness: 0
};

const RATING_CATEGORIES: RatingCategory[] = [
  { id: 'clarity', label: '分かりやすさ', description: '内容は明確で理解しやすいか' },
  { id: 'entertainment', label: '面白さ', description: '楽しく視聴できる内容か' },
  { id: 'originality', label: '独自性', description: '新鮮でオリジナリティがあるか' },
  { id: 'quality', label: '品質', description: '映像・音声の品質は高いか' },
  { id: 'reliability', label: '信頼性', description: '情報は正確で信頼できるか' },
  { id: 'usefulness', label: '有用性', description: '実用的で役立つ内容か' }
];

export function ReviewForm({ 
  videoId, 
  onReviewSubmitted, 
  existingReview,
  onCancel,
  onDelete,
  className = "",
  redirectAfterSubmit = false,
  detailedRating = false,
  showGuidelines = true,
  title
}: ReviewFormProps) {
  const { user } = useAuth(); // currentUser を user に変更
  const navigate = useNavigate();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [detailedRatings, setDetailedRatings] = useState<DetailedRatings>(
    (existingReview as any)?.detailed_ratings || DEFAULT_DETAILED_RATINGS // 型アサーションを使用
  );
  const [content, setContent] = useState(existingReview?.content || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(existingReview?.content?.length || 0);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const MAX_CHARS = 1000;
  const MIN_CHARS = 10;

  useEffect(() => {
    const checkExistingReview = async () => {
      if (user) { // currentUser を user に変更
        try {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('video_id', videoId)
            .eq('user_id', user.id) // currentUser を user に変更
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          setHasUserReviewed(!!data);
        } catch (err) {
          console.error('Error checking existing review:', err);
          setError('レビュー情報の取得に失敗しました');
        }
      }
    };
    
    if (!existingReview) {
      checkExistingReview();
    }
  }, [videoId, user, existingReview, retryCount]); // currentUser を user に変更

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_CHARS) {
      setContent(text);
      setCharCount(text.length);
      if (error) setError(null);
    }
  };

  const handleDetailedRatingChange = (category: string, value: number) => {
    setDetailedRatings(prev => ({
      ...prev,
      [category]: value
    }));

    // 総合評価は詳細評価の平均値をベースに更新
    if (detailedRating) {
      const newDetailedRatings = {
        ...detailedRatings,
        [category]: value
      };
      
      // 詳細評価の平均値を計算（overall除く）
      const categories = RATING_CATEGORIES.map(cat => cat.id);
      const sum = categories.reduce((acc, cat) => acc + newDetailedRatings[cat as keyof DetailedRatings], 0);
      const average = sum / categories.length;
      
      // 総合評価を小数点第一位までの値に更新
      const newOverall = Math.round(average * 10) / 10;
      setRating(newOverall);
      setDetailedRatings(prev => ({
        ...prev,
        [category]: value,
        overall: newOverall
      }));
    }

    if (error) setError(null);
  };

  const handleDelete = async () => {
    if (!existingReview) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('reviews')
        .delete()
        .match({ id: existingReview.id });

      if (error) throw error;

      // レビュー削除後にビデオのレビュー数を更新
      await updateVideoReviewCount(videoId);
      onDelete?.();
      
      if (redirectAfterSubmit) {
        navigate(`/video/${videoId}`);
      }
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
    
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('レビュー内容を入力してください');
      return false;
    }
    
    if (trimmedContent.length < MIN_CHARS) {
      setError(`レビュー内容は${MIN_CHARS}文字以上入力してください`);
      return false;
    }
    
    if (trimmedContent.length > MAX_CHARS) {
      setError(`レビュー内容は${MAX_CHARS}文字以内で入力してください`);
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

      // レビュー情報の準備
      const reviewData = {
        video_id: videoId,
        user_id: user?.id, // currentUser を user に変更
        rating,
        content: content.trim(),
        detailed_ratings: detailedRating ? detailedRatings : null
      };

      if (existingReview) {
        // 既存レビューの更新
        const { error } = await supabase
          .from('reviews')
          .update(reviewData)
          .eq('id', existingReview.id);
          
        if (error) throw error;
      } else {
        // 新規レビューの投稿
        const { error } = await supabase
          .from('reviews')
          .insert(reviewData);
          
        if (error) throw error;
      }

      // レビュー投稿・更新後にレビュー数を更新
      await updateVideoReviewCount(videoId);

      setSubmitSuccess(true);
      
      // 親コンポーネントのコールバック関数を呼び出し
      if (onReviewSubmitted) {
        await onReviewSubmitted(rating, content.trim());
      }

      if (!existingReview) {
        setTimeout(() => {
          setHasUserReviewed(true);
          
          if (redirectAfterSubmit) {
            navigate(`/video/${videoId}`);
          }
        }, 2000);
      }

    } catch (err: any) {
      console.error('Review submission error:', err);
      setError(err.message || 'レビューの投稿に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // ビデオのレビュー数を更新する関数
  const updateVideoReviewCount = async (videoId: string): Promise<number> => {
    try {
      // レビュー数を集計するクエリ
      const { count, error } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('video_id', videoId);

      if (error) throw error;

      // 動画のレビュー数を更新
      const { error: updateError } = await supabase
        .from('videos')
        .update({ review_count: count })
        .eq('id', videoId);

      if (updateError) throw updateError;

      return count || 0;
    } catch (err) {
      console.error('Error updating review count:', err);
      return 0;
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  if (!user) { // currentUser を user に変更
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            レビューを投稿するにはログインが必要です
          </h3>
          <div className="space-x-4">
            <Link
              to={`/login?redirect=/video/${videoId}`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              ログイン
            </Link>
            <Link
              to={`/signup?redirect=/video/${videoId}`}
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
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center text-gray-600">
          この動画にはすでにレビューを投稿済みです
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      {submitSuccess ? (
        <div className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-md">
          <ThumbsUp className="w-5 h-5 mr-2" />
          レビューを{existingReview ? '更新' : '投稿'}しました
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {title || (existingReview ? 'レビューを編集' : 'レビューを投稿')}
            </h3>
            {existingReview && !deleteConfirm && (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700"
                aria-label="レビューを削除"
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
                  disabled={loading}
                >
                  {loading ? '処理中...' : '削除する'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center text-red-600 mb-2">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs text-red-600 hover:text-red-800 flex items-center ml-auto"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                再試行
              </button>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              総合評価
            </label>
            <div className="flex items-center">
              <StarRating
                rating={rating}
                onRatingChange={(newRating) => {
                  setRating(newRating);
                  // 詳細評価モードの場合は、すべてのカテゴリに同じ値を設定
                  if (detailedRating) {
                    const updatedRatings = { ...detailedRatings };
                    RATING_CATEGORIES.forEach(category => {
                      updatedRatings[category.id as keyof DetailedRatings] = newRating;
                    });
                    updatedRatings.overall = newRating;
                    setDetailedRatings(updatedRatings);
                  }
                  if (error) setError(null);
                }}
                size="lg"
              />
              <span className="ml-2 text-2xl font-bold text-gray-700">
                {rating ? rating.toFixed(1) : '-'}
              </span>
            </div>
          </div>

          {detailedRating && (
            <div className="mb-6 border-t border-b border-gray-100 py-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">詳細評価</h4>
              <div className="space-y-4">
                {RATING_CATEGORIES.map((category) => (
                  <div key={category.id} className="flex flex-col sm:flex-row sm:items-center">
                    <div className="sm:w-1/3 mb-1 sm:mb-0">
                      <label 
                        htmlFor={`rating-${category.id}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        {category.label}
                      </label>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>
                    <div className="sm:w-2/3 flex items-center">
                      <StarRating
                        rating={detailedRatings[category.id as keyof DetailedRatings]}
                        onRatingChange={(value) => handleDetailedRatingChange(category.id, value)}
                        size="sm"
                        // StarRating コンポーネントから id プロパティを削除
                      />
                      <span className="ml-2 text-sm font-medium text-gray-600">
                        {detailedRatings[category.id as keyof DetailedRatings] || '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-2">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              レビュー内容
            </label>
            <textarea
              id="content"
              rows={4}
              value={content}
              onChange={handleContentChange}
              className={`w-full rounded-md shadow-sm ${
                charCount > MAX_CHARS * 0.9
                  ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
              placeholder="この動画の感想を書いてください..."
              aria-describedby="content-description"
            />
          </div>

          <div className="flex justify-end mb-4">
            <span 
              className={`text-sm ${
                charCount > MAX_CHARS * 0.9 
                  ? charCount >= MAX_CHARS 
                    ? 'text-red-600' 
                    : 'text-yellow-600' 
                  : 'text-gray-500'
              }`}
              id="content-description"
            >
              {charCount}/{MAX_CHARS}文字
            </span>
          </div>

          {showGuidelines && (
            <div className="text-sm text-gray-500 mb-4">
              <ul className="list-disc list-inside space-y-1">
                <li>投稿したレビューは公開され、他のユーザーが参照できます</li>
                <li>不適切な内容は削除される場合があります</li>
                <li>レビュー内容は{MIN_CHARS}文字以上、{MAX_CHARS}文字以内で入力してください</li>
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={loading}
              >
                キャンセル
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  投稿中...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-1.5" />
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