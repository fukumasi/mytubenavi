// src/components/search/SearchResults.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Eye, Clock, RefreshCw } from 'lucide-react';
import type { Video } from '@/types';

interface SearchResultsProps {
  videos: Video[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  title?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  sortOptions?: {
    field: keyof Video | 'relevance';
    direction: 'asc' | 'desc';
  };
  onSortChange?: (field: keyof Video | 'relevance', direction: 'asc' | 'desc') => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  videos,
  loading,
  error,
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  title,
  onRetry,
  emptyMessage = '検索結果が見つかりませんでした。',
  sortOptions,
  onSortChange
}: SearchResultsProps) => {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<keyof Video | 'relevance'>(sortOptions?.field || 'relevance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(sortOptions?.direction || 'desc');

  // ソート変更ハンドラー
  const handleSortChange = (field: keyof Video | 'relevance') => {
    // 同じフィールドの場合はソート方向を反転
    const newDirection = field === sortField && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortDirection(newDirection);
    
    if (onSortChange) {
      onSortChange(field, newDirection);
    }
  };

  const formatViewCount = (count?: number) => {
    if (!count) return '-';
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    return count.toLocaleString();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
  };

  // ページネーション用の表示ページ番号配列を生成
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      // 5ページ以下ならすべて表示
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // 現在のページに基づいて表示するページを決定
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + 4);
      return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    }
  };

  const pageNumbers = getPageNumbers();

  // ローディング表示
  if (loading) {
    return (
      <div className={`flex flex-col justify-center items-center min-h-[400px] ${className}`}>
        {title && <h2 className="text-xl font-semibold mb-6 text-white">{title}</h2>}
        <RefreshCw className="animate-spin h-12 w-12 text-indigo-600 mb-4" />
        <p className="text-gray-400">検索結果を読み込み中...</p>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        {title && <h2 className="text-xl font-semibold mb-6 text-white">{title}</h2>}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-400 mb-3">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              aria-label="再試行"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline-block" />
              再試行
            </button>
          )}
        </div>
      </div>
    );
  }

  // 結果なし表示
  if (videos.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        {title && <h2 className="text-xl font-semibold mb-6 text-white">{title}</h2>}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-md mx-auto">
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* タイトルとソート */}
      <div className="mb-4">
        {title && <h2 className="text-xl font-semibold mb-2 text-white">{title}</h2>}
        
        {/* ソートボタン - ジャンル一覧ページと同様のレイアウト */}
        {onSortChange && (
          <div className="flex items-center mt-1 mb-2">
            <span className="text-sm text-gray-400 mr-2">並び替え:</span>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleSortChange('title')}
                className={`px-3 py-1 text-xs rounded ${
                  sortField === 'title' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                タイトル
              </button>
              
              <button
                onClick={() => handleSortChange('rating')}
                className={`px-3 py-1 text-xs rounded ${
                  sortField === 'rating' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                評価
              </button>
              
              <button
                onClick={() => handleSortChange('view_count')}
                className={`px-3 py-1 text-xs rounded ${
                  sortField === 'view_count' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                再生回数
              </button>
              
              <button
                onClick={() => handleSortChange('published_at')}
                className={`px-3 py-1 text-xs rounded ${
                  sortField === 'published_at' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                投稿日
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* テーブルヘッダー */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-900 text-gray-300 text-xs">
              <th className="p-2 text-left font-medium" style={{ width: '50%' }}>タイトル</th>
              <th className="p-2 text-center font-medium" style={{ width: '10%' }}>
                <div className="flex items-center justify-center">
                  <Star className="h-3 w-3 text-yellow-400 mr-1" />
                  <span>評価</span>
                </div>
              </th>
              <th className="p-2 text-center font-medium" style={{ width: '15%' }}>
                <div className="flex items-center justify-center">
                  <Eye className="h-3 w-3 mr-1" />
                  <span>再生回数</span>
                </div>
              </th>
              <th className="p-2 text-center font-medium" style={{ width: '15%' }}>チャンネル</th>
              <th className="p-2 text-center font-medium" style={{ width: '10%' }}>
                <div className="flex items-center justify-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>投稿日</span>
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody>
            {videos.map((video) => (
              <tr 
                key={video.id}
                onClick={() => navigate(`/video/${video.youtube_id || video.id}`)}
                className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <td className="p-2">
                  <div className="flex items-center">
                    {/* サムネイル */}
                    <div className="w-40 h-24 md:w-80 md:h-48 flex-shrink-0 mr-3">
                      <img
                        src={video.thumbnail || video.thumbnail_url || '/placeholder.jpg'}
                        alt={video.title}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = '/placeholder.jpg';
                        }}
                        loading="lazy"
                      />
                    </div>
                    
                    {/* タイトル */}
                    <span className="text-xs sm:text-sm text-white line-clamp-2">
                      {video.title}
                    </span>
                  </div>
                </td>
                
                <td className="p-2 text-center text-xs text-gray-300">
                  {(video.rating || video.avg_rating || 0).toFixed(1)}
                </td>
                
                <td className="p-2 text-center text-xs text-gray-300">
                  {formatViewCount(video.view_count)} 回視聴
                </td>
                
                <td className="p-2 text-center text-xs text-gray-300 truncate max-w-[150px]">
                  {video.channel_title || '-'}
                </td>
                
                <td className="p-2 text-center text-xs text-gray-300">
                  {formatDate(video.published_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-1 rounded-l border border-gray-700 bg-gray-800 text-gray-300 disabled:opacity-50"
          >
            前へ
          </button>
          
          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-4 py-1 border-t border-b border-gray-700 ${
                currentPage === page ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-1 rounded-r border border-gray-700 bg-gray-800 text-gray-300 disabled:opacity-50"
          >
            次へ
          </button>
        </div>
      )}
      
      {/* もっと見るボタン */}
      {totalPages > 5 && (
        <div className="text-center mt-4">
          <button
            onClick={() => onPageChange(currentPage < totalPages ? currentPage + 1 : 1)}
            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            さらに読み込む
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;