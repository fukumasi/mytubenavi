// src/components/search/review/ReviewList.tsx

import { User, ThumbsUp, Pencil, Trash2, RefreshCw, Filter } from 'lucide-react';
import type { Review } from '@/types/review';
import { StarRating } from './StarRating';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  videoId?: string;
  className?: string;
  title?: string;
  emptyMessage?: string;
  showFilters?: boolean;
  maxItems?: number;
  loadingMessage?: string;
}

export const ReviewList = ({ 
  reviews = [], 
  currentUserId,
  onEdit,
  onDelete,
  videoId,
  className = "",
  title = "レビュー一覧",
  emptyMessage = "まだレビューはありません。最初のレビューを投稿してみましょう！",
  showFilters = true,
  maxItems,
  loadingMessage = "レビューを読み込み中..."
}: ReviewListProps) => {
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userHelpful, setUserHelpful] = useState<Record<string, boolean>>({});
  
  // フィルタリング用の状態
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'helpful'>('newest');
  
  // ユーザーが「役に立った」を押したレビューを取得
  const fetchUserHelpful = async () => {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('helpful_reviews')
        .select('review_id')
        .eq('user_id', currentUserId);
        
      if (error) throw error;
      
      const helpfulMap: Record<string, boolean> = {};
      const helpfulSet = new Set<string>();
      
      if (data) {
        data.forEach(item => {
          helpfulMap[item.review_id] = true;
          helpfulSet.add(item.review_id);
        });
      }
      
      setUserHelpful(helpfulMap);
      setHelpfulReviews(helpfulSet);
    } catch (err) {
      console.error('「役に立った」情報の取得中にエラーが発生しました:', err);
    }
  };

  const fetchHelpfulCounts = async () => {
    if (reviews.length === 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('helpful_reviews')
        .select('review_id, count')
        .in('review_id', reviews.map(r => r.id));

      if (error) throw error;
      
      if (data) {
        const counts = data.reduce((acc: Record<string, number>, item: { review_id: string, count: number }) => {
          acc[item.review_id] = item.count;
          return acc;
        }, {});
        setHelpfulCounts(counts);
      }
    } catch (err) {
      console.error('レビューの「役に立った」カウントの取得中にエラーが発生しました:', err);
      setError('レビュー情報の取得に失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHelpfulCounts();
    fetchUserHelpful();
  }, [reviews, currentUserId]);

  const handleDelete = async (reviewId: string) => {
    if (window.confirm('このレビューを削除してもよろしいですか？')) {
      try {
        setIsLoading(true);
        
        const { error } = await supabase
          .from('reviews')
          .delete()
          .match({ id: reviewId, user_id: currentUserId });

        if (error) throw error;
        onDelete?.(reviewId);
      } catch (error) {
        console.error('レビューの削除中にエラーが発生しました:', error);
        setError('レビューの削除に失敗しました。再度お試しください。');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleHelpful = async (reviewId: string) => {
    if (!currentUserId) {
      alert('「役に立った」を評価するにはログインが必要です。');
      return;
    }

    try {
      setIsLoading(true);
      
      if (userHelpful[reviewId]) {
        // すでに「役に立った」と評価している場合は削除
        const { error } = await supabase
          .from('helpful_reviews')
          .delete()
          .match({ 
            review_id: reviewId, 
            user_id: currentUserId 
          });

        if (error) throw error;
        
        // 状態を更新
        const newHelpfulReviews = new Set(helpfulReviews);
        newHelpfulReviews.delete(reviewId);
        setHelpfulReviews(newHelpfulReviews);
        
        setUserHelpful(prev => ({
          ...prev,
          [reviewId]: false
        }));
        
        setHelpfulCounts(prev => ({
          ...prev,
          [reviewId]: Math.max((prev[reviewId] || 1) - 1, 0)
        }));
      } else {
        // 「役に立った」と評価
        const { error } = await supabase
          .from('helpful_reviews')
          .insert({ 
            review_id: reviewId, 
            user_id: currentUserId,
            video_id: videoId
          });

        if (error) throw error;
        
        // 状態を更新
        const newHelpfulReviews = new Set(helpfulReviews);
        newHelpfulReviews.add(reviewId);
        setHelpfulReviews(newHelpfulReviews);
        
        setUserHelpful(prev => ({
          ...prev,
          [reviewId]: true
        }));
        
        setHelpfulCounts(prev => ({
          ...prev,
          [reviewId]: (prev[reviewId] || 0) + 1
        }));
      }
    } catch (err) {
      console.error('「役に立った」の更新中にエラーが発生しました:', err);
      setError('評価の更新に失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setRatingFilter(null);
    setSortOrder('newest');
  };

  // フィルタリングとソートを適用したレビューリスト
  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    
    // 評価フィルター
    if (ratingFilter !== null) {
      result = result.filter(review => 
        review.rating && Math.floor(review.rating) === ratingFilter
      );
    }
    
    // ソート
    switch (sortOrder) {
      case 'newest':
        result.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'oldest':
        result.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case 'helpful':
        result.sort((a, b) => 
          (helpfulCounts[b.id] || 0) - (helpfulCounts[a.id] || 0)
        );
        break;
    }
    
    // 表示上限
    if (maxItems && result.length > maxItems) {
      result = result.slice(0, maxItems);
    }
    
    return result;
  }, [reviews, ratingFilter, sortOrder, helpfulCounts, maxItems]);

  const handleRetry = () => {
    setError(null);
    fetchHelpfulCounts();
    fetchUserHelpful();
  };

  // ローディング表示
  if (isLoading && reviews.length === 0) {
    return (
      <div className={`${className}`}>
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        <div className="flex items-center justify-center py-8 text-gray-500">
          <RefreshCw className="animate-spin w-5 h-5 mr-2" />
          <span>{loadingMessage}</span>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error && reviews.length === 0) {
    return (
      <div className={`${className}`}>
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            再試行
          </button>
        </div>
      </div>
    );
  }

  // レビューがない場合
  if (!filteredReviews.length) {
    return (
      <div className={`${className}`}>
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        
        {showFilters && reviews.length > 0 && (
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">フィルター適用中</span>
            </div>
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              フィルターをリセット
            </button>
          </div>
        )}
        
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      
      {/* フィルターコントロール */}
      {showFilters && reviews.length > 1 && (
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-700">評価:</span>
            {[5, 4, 3, 2, 1].map(stars => (
              <button
                key={stars}
                onClick={() => setRatingFilter(ratingFilter === stars ? null : stars)}
                className={`inline-flex items-center px-2 py-1 text-xs rounded-full transition-colors ${
                  ratingFilter === stars 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
                aria-pressed={ratingFilter === stars}
              >
                <span>{stars}</span>
                <StarRating rating={stars} size="sm" readOnly={true} />
              </button>
            ))}
          </div>
          
          <div className="ml-auto flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-700">並び替え:</span>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'helpful')}
              className="text-sm border border-gray-300 rounded py-1 px-2 bg-white"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="helpful">役立つ順</option>
            </select>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-red-600 text-sm mb-1">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            再試行
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <div 
            key={review.id} 
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {review.profiles?.avatar_url ? (
                    <img
                      src={review.profiles.avatar_url}
                      alt={review.profiles.username || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {review.profiles?.username || 'ゲスト'}
                  </div>
                  {review.rating && (
                    <div className="flex items-center">
                      <StarRating 
                        rating={review.rating} 
                        size="sm" 
                        readOnly={true}
                      />
                      <span className="ml-1 text-sm text-gray-600">{review.rating.toFixed(1)}</span>
                    </div>
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
                        aria-label="レビューを編集"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="削除"
                        aria-label="レビューを削除"
                        disabled={isLoading}
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
            
            <div className="flex items-center justify-between">
              <button 
                onClick={() => handleHelpful(review.id)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                  userHelpful[review.id]
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
                aria-label="役に立った"
                disabled={isLoading}
              >
                <ThumbsUp className="w-3 h-3 mr-1" />
                <span>役に立った {helpfulCounts[review.id] || 0}</span>
              </button>
              
              {/* モバイル対応の情報表示 */}
              <div className="text-xs text-gray-500 md:hidden">
                {new Date(review.created_at).toLocaleDateString('ja-JP', {
                  month: 'numeric',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 表示件数制限がある場合のもっと見るボタン */}
      {maxItems && reviews.length > maxItems && (
        <div className="text-center mt-6">
          <button
            onClick={() => window.location.href = `/video/${videoId}#reviews`}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
          >
            すべてのレビューを見る ({reviews.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;