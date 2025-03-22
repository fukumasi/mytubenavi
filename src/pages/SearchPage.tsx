// src/pages/SearchPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import debounce from 'lodash/debounce';
import { searchVideos } from '../lib/supabase';
import { YouTubeAPI } from '../lib/youtube';
import type { Video } from '../types';
import { Loader, Star, Eye, Clock } from 'lucide-react';

// ページネーション用のコンポーネント
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      // 5ページ以下なら全て表示
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // 現在のページに基づいて表示するページを決定
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + 4);
      return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    }
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-md transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="前のページ"
      >
        前へ
      </button>

      {getPageNumbers().map(pageNum => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={`px-4 py-2 rounded-md transition-colors ${
            currentPage === pageNum
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
          }`}
          aria-label={`${pageNum}ページ目`}
          aria-current={currentPage === pageNum ? 'page' : undefined}
        >
          {pageNum}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 rounded-md transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="次のページ"
      >
        次へ
      </button>
    </div>
  );
};

// ソートフィールドの型
type SortFieldType = 'published_at' | 'view_count' | 'rating' | 'title';

// メインの検索ページコンポーネント
const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';
  const sortFieldParam = searchParams.get('sort') || 'published_at';
  const sortDirection = searchParams.get('dir') || 'desc';
  const dateRange = searchParams.get('date') || '';
  const duration = searchParams.get('duration') || '';

  const [videos, setVideos] = useState<Video[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);  // 全ての検索結果を保持
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortFieldType>(sortFieldParam as SortFieldType);
  const [sortDir] = useState<'asc' | 'desc'>(sortDirection as 'asc' | 'desc');
  const resultsPerPage = 10;  // 1ページあたりの表示件数
  
  // ページの種類を判断
  const isKeywordSearch = Boolean(query);
  const isGenreSearch = Boolean(genre) && !query;

  // フォーマット関数
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

  // フィルター変更時にURLを更新
  const updateSearchParams = useCallback((newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    navigate(`/search?${params.toString()}`);
  }, [navigate, searchParams]);

  // ソート変更ハンドラー
  const handleSortChange = useCallback((newSort: SortFieldType) => {
    setSortField(newSort);
    updateSearchParams({ sort: newSort });
  }, [updateSearchParams]);

  // 動画検索処理（デバウンス付き）
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setVideos([]);
        setAllVideos([]);
        setTotalPages(0);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const dbResult = await searchVideos(searchQuery);

        if (dbResult.videos.length === 0) {
          // YouTube API検索オプションを別のオブジェクトとして定義
          const searchOptions: any = {};
          if (dateRange) searchOptions.dateRange = dateRange;
          if (duration) searchOptions.duration = duration;
          
          const youtubeResult = await YouTubeAPI.searchVideos(searchQuery, 50, searchOptions);
          setAllVideos(youtubeResult.videos);
          setVideos(youtubeResult.videos.slice(0, resultsPerPage));
          setTotalPages(Math.ceil(youtubeResult.totalResults / resultsPerPage));
        } else {
          let filteredVideos = dbResult.videos;

          // ジャンルフィルター
          if (genre) {
            filteredVideos = filteredVideos.filter(v => v.genre_id === genre);
          }

          // 日付フィルター
          if (dateRange) {
            const now = new Date();
            let dateLimit: Date | null = null;
            
            switch (dateRange) {
              case 'today':
                dateLimit = new Date(now.setHours(0, 0, 0, 0));
                break;
              case 'week':
                dateLimit = new Date(now.setDate(now.getDate() - 7));
                break;
              case 'month':
                dateLimit = new Date(now.setMonth(now.getMonth() - 1));
                break;
              case 'year':
                dateLimit = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            }
            
            if (dateLimit) {
              filteredVideos = filteredVideos.filter(v => 
                v.published_at && new Date(v.published_at) >= dateLimit!
              );
            }
          }

          // 動画長さフィルター
          if (duration) {
            filteredVideos = filteredVideos.filter(v => {
              // 型安全なアクセスのためにプロパティの存在チェック
              const durationSec = (v as any).duration_seconds || 0;
              switch (duration) {
                case 'short': return durationSec < 240; // 4分未満
                case 'medium': return durationSec >= 240 && durationSec <= 1200; // 4〜20分
                case 'long': return durationSec > 1200; // 20分以上
                default: return true;
              }
            });
          }

          // ソート処理
          filteredVideos.sort((a, b) => {
            const factor = sortDir === 'asc' ? 1 : -1;
            if (sortField === 'published_at') {
              return factor * (new Date(a.published_at || "").getTime() - new Date(b.published_at || "").getTime());
            } else if (sortField === 'rating') {
              const ratingA = Number(a.rating || a.avg_rating || 0);
              const ratingB = Number(b.rating || b.avg_rating || 0);
              return factor * (ratingA - ratingB);
            } else if (sortField === 'title') {
              return factor * a.title.localeCompare(b.title);
            } else if (sortField === 'view_count') {
              return factor * ((a.view_count || 0) - (b.view_count || 0));
            }
            // デフォルトは投稿日でソート
            return factor * (new Date(a.published_at || "").getTime() - new Date(b.published_at || "").getTime());
          });

          setAllVideos(filteredVideos);
          const totalPages = Math.ceil(filteredVideos.length / resultsPerPage);
          setTotalPages(totalPages);

          // ページが存在する範囲に収める
          const validPage = Math.min(Math.max(1, currentPage), totalPages || 1);
          if (validPage !== currentPage) {
            setCurrentPage(validPage);
          }

          const startIndex = (validPage - 1) * resultsPerPage;
          const endIndex = startIndex + resultsPerPage;
          setVideos(filteredVideos.slice(startIndex, endIndex));
        }
      } catch (err) {
        setError('検索中にエラーが発生しました。もう一度お試しください。');
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [sortField, sortDir, currentPage, dateRange, duration, genre]
  );

  // 検索クエリが変更されたら検索実行
  useEffect(() => {
    if (query) {
      debouncedSearch(query);
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  // ページ変更時に表示する動画を更新
  useEffect(() => {
    if (allVideos.length > 0) {
      const startIndex = (currentPage - 1) * resultsPerPage;
      const endIndex = startIndex + resultsPerPage;
      setVideos(allVideos.slice(startIndex, endIndex));
    }
  }, [currentPage, allVideos]);

  // ページ変更ハンドラー
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // 画面上部にスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto px-4 py-4 bg-white relative mt-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 左カラム - サブジャンル/プロモーションエリア */}
        <div className="md:col-span-1">
          <div className="bg-white p-4 rounded border border-gray-200">
            <h2 className="text-lg font-medium text-gray-800 mb-4">おすすめ動画</h2>
            <div className="space-y-2">
              <div className="bg-gray-100 p-4 text-center text-gray-600 rounded">
                プロモーション動画エリア
              </div>
            </div>
          </div>
        </div>
        
        {/* 右カラム - 検索結果 */}
        <div className="md:col-span-3">
          {/* ヘッダー */}
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-gray-800 mb-2">
              {isKeywordSearch ? `「${query}」の検索結果` : 
               isGenreSearch ? `${genre}の動画一覧` : 
               '動画を探す'}
            </h1>
            
            {/* 並び替えボタン */}
            <div className="flex items-center space-x-1 mt-2 mb-4">
              <span className="text-sm text-gray-600 mr-2">並び替え:</span>
              <button
                onClick={() => handleSortChange('title')}
                className={`px-3 py-1 text-xs rounded ${
                  sortField === 'title' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                タイトル
              </button>
              <button
                onClick={() => handleSortChange('rating')}
                className={`px-3 py-1 text-xs rounded ${
                  sortField === 'rating' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                評価
              </button>
              <button
                onClick={() => handleSortChange('view_count')}
                className={`px-3 py-1 text-xs rounded ${
                  sortField === 'view_count' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                再生回数
              </button>
              <button
                onClick={() => handleSortChange('published_at')}
                className={`px-3 py-1 text-xs rounded ${
                  sortField === 'published_at' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                投稿日
              </button>
            </div>
          </div>
          
          {/* ローディング状態 */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          ) : (
            <div>
              {/* エラー表示 */}
              {error && (
                <div className="bg-red-100 border border-red-400 rounded p-4 mb-4 text-red-700">
                  {error}
                </div>
              )}
              
              {/* デスクトップ表示 - テーブル形式 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-xs">
                      <th className="p-2 text-left font-medium" style={{ width: '50%' }}>タイトル</th>
                      <th className="p-2 text-center font-medium" style={{ width: '10%' }}>
                        <div className="flex items-center justify-center">
                          <Star className="h-3 w-3 text-yellow-400 mr-1" />
                          <span>評価</span>
                        </div>
                      </th>
                      <th className="p-2 text-center font-medium" style={{ width: '15%' }}>
                        <div className="flex items-center justify-center">
                          <Eye className="h-3 w-3 text-gray-600 mr-1" />
                          <span>再生回数</span>
                        </div>
                      </th>
                      <th className="p-2 text-center font-medium" style={{ width: '15%' }}>チャンネル</th>
                      <th className="p-2 text-center font-medium" style={{ width: '10%' }}>
                        <div className="flex items-center justify-center">
                          <Clock className="h-3 w-3 text-gray-600 mr-1" />
                          <span>投稿日</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {videos.length > 0 ? (
                      videos.map((video) => (
                        <tr 
                          key={video.id}
                          onClick={() => navigate(`/video/${video.youtube_id || video.id}`)}
                          className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <td className="p-2">
                            <div className="flex items-center">
                              {/* サムネイル */}
                              <div className="w-20 h-12 flex-shrink-0 mr-2">
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
                              <span className="text-xs sm:text-sm text-gray-800 line-clamp-2">
                                {video.title}
                              </span>
                            </div>
                          </td>
                          
                          <td className="p-2 text-center text-xs text-gray-700">
                            {(video.rating || video.avg_rating || 0).toFixed(1)}
                          </td>
                          
                          <td className="p-2 text-center text-xs text-gray-700">
                            {formatViewCount(video.view_count)} 回視聴
                          </td>
                          
                          <td className="p-2 text-center text-xs text-gray-700 truncate max-w-[150px]">
                            {video.channel_title || '-'}
                          </td>
                          
                          <td className="p-2 text-center text-xs text-gray-700">
                            {formatDate(video.published_at)}
                          </td>
                        </tr>
                      ))
                    ) : query ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">
                          <p>検索結果が見つかりませんでした</p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              
              {/* モバイル表示 - 2行カード形式 */}
              <div className="sm:hidden space-y-3">
                {videos.length > 0 ? (
                  videos.map((video) => (
                    <div 
                      key={video.id} 
                      className="bg-white border border-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/video/${video.youtube_id || video.id}`)}
                    >
                      {/* 上段: サムネイルとタイトル */}
                      <div className="flex p-2">
                        <div className="w-24 h-14 flex-shrink-0 mr-2">
                          <img
                            src={video.thumbnail || video.thumbnail_url || '/placeholder.jpg'}
                            alt={video.title}
                            className="w-full h-full object-cover rounded"
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = '/placeholder.jpg';
                            }}
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xs text-gray-800 line-clamp-2">{video.title}</h3>
                          <p className="text-xs text-gray-500 mt-1 truncate">{video.channel_title || '-'}</p>
                        </div>
                      </div>
                      
                      {/* 下段: 評価、再生数、投稿日 */}
                      <div className="bg-gray-100 px-2 py-1 flex justify-between text-xs text-gray-600">
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 mr-1" />
                          <span>{(video.rating || video.avg_rating || 0).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center">
                          <Eye className="h-3 w-3 text-gray-500 mr-1" />
                          <span>{formatViewCount(video.view_count)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 text-gray-500 mr-1" />
                          <span>{formatDate(video.published_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : query ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>検索結果が見つかりませんでした</p>
                  </div>
                ) : null}
              </div>
              
              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="mt-6 text-center">
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={handlePageChange} 
                  />
                  
                  {/* さらに読み込むボタン */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                  >
                    さらに読み込む
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;