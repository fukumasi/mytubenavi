// src/components/home/LatestReviewedVideos.tsx
import { useEffect, useState } from 'react';
import { getVideosByReviewCount } from '@/lib/supabase';
import { Video } from '@/types';
import VideoPlayer from '../video/VideoPlayer';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@/hooks/useMediaQuery';

// ソートオプションの型定義
type SortOption = {
  label: string;
  value: string;
  ascending: boolean;
  field: string;
};

export default function LatestReviewedVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showAll, setShowAll] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(6);

  // ソートオプション
  const sortOptions: SortOption[] = [
    { label: 'レビュー数が多い順', value: 'reviews-desc', ascending: false, field: 'review_count' },
    { label: 'レビュー数が少ない順', value: 'reviews-asc', ascending: true, field: 'review_count' },
    { label: '評価が高い順', value: 'rating-desc', ascending: false, field: 'avg_rating' },
    { label: '評価が低い順', value: 'rating-asc', ascending: true, field: 'avg_rating' },
    { label: '新しい順', value: 'date-desc', ascending: false, field: 'published_at' },
    { label: '古い順', value: 'date-asc', ascending: true, field: 'published_at' },
  ];
  
  const [selectedSort, setSelectedSort] = useState<SortOption>(sortOptions[0]);

  const handleVideoClick = (video: Video, shouldNavigate: boolean = false) => {
    if (!video || !video.youtube_id) return;

    if (shouldNavigate) {
      navigate(`/video/${video.youtube_id}`);
      return;
    }
    
    setPlayingVideoId(prevId => prevId === video.youtube_id ? null : video.youtube_id);
  };

  // もっと見るボタンのハンドラー
  const handleShowMore = () => {
    if (showAll) {
      setDisplayLimit(6);
      setShowAll(false);
    } else {
      setDisplayLimit(allVideos.length);
      setShowAll(true);
    }
  };

  // ソート変更のハンドラー
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = sortOptions.find(option => option.value === e.target.value);
    if (selectedOption) {
      setSelectedSort(selectedOption);
      sortVideos(selectedOption);
    }
  };

  
// 動画のソート処理
const sortVideos = (sortOption: SortOption) => {
  const sorted = [...allVideos].sort((a, b) => {
    let valueA: any;
    let valueB: any;
    
    switch (sortOption.field) {
      case 'avg_rating':
        valueA = a.avg_rating || 0;
        valueB = b.avg_rating || 0;
        break;
      case 'published_at':
        // published_at がない場合は created_at を使用
        valueA = a.published_at ? new Date(a.published_at).getTime() : 
                a.created_at ? new Date(a.created_at).getTime() : 0;
        valueB = b.published_at ? new Date(b.published_at).getTime() : 
                b.created_at ? new Date(b.created_at).getTime() : 0;
        break;
      case 'review_count':
        valueA = a.review_count || 0;
        valueB = b.review_count || 0;
        break;
      default:
        valueA = a.review_count || 0;
        valueB = b.review_count || 0;
    }
    
    if (sortOption.ascending) {
      return valueA - valueB;
    } else {
      return valueB - valueA;
    }
  });
  
  setAllVideos(sorted);
  setVideos(sorted.slice(0, displayLimit));
};

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        // より多くの動画を取得するために20に変更（すべてを表示するためのもっと見る機能用）
        const videosData = await getVideosByReviewCount(20);
        console.log('Found reviewed videos:', videosData.length);
        setAllVideos(videosData);
        setVideos(videosData.slice(0, displayLimit));
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('動画の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // displayLimitが変更されたときに表示する動画を更新
  useEffect(() => {
    setVideos(allVideos.slice(0, displayLimit));
  }, [displayLimit, allVideos]);

  // selectedSortが変更されたときに動画をソート
  useEffect(() => {
    if (allVideos.length > 0) {
      sortVideos(selectedSort);
    }
  }, [selectedSort]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <p>{error}</p>
      </div>
    );
  }

  // ソート選択のUI - 上部に表示
  const sortControlUI = (
    <div className="mb-4">
      <label htmlFor="review-sort-select" className="text-sm text-gray-600 dark:text-dark-text-secondary mr-2">
        並び替え:
      </label>
      <select
        id="review-sort-select"
        value={selectedSort.value}
        onChange={handleSortChange}
        className="bg-white dark:bg-dark-surface text-gray-800 dark:text-dark-text-primary rounded border border-gray-300 dark:border-dark-border px-3 py-1 text-sm"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  // もっと見るボタンのUI - 下部に表示
  const showMoreButtonUI = allVideos.length > 6 && (
    <div className="flex justify-center mt-6">
      <button
        onClick={handleShowMore}
        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded text-sm transition-colors"
      >
        {showAll ? '表示を減らす' : 'もっと見る'}
      </button>
    </div>
  );

  // モバイル向けコンパクトビデオカード
  if (isMobile) {
    return (
      <div>
        {sortControlUI}
        
        <div className="grid grid-cols-2 gap-3">
          {videos.length > 0 ? (
            videos.map((video) => (
              <div
                key={video.id}
                className="bg-white dark:bg-dark-surface rounded shadow overflow-hidden cursor-pointer"
                onClick={() => handleVideoClick(video, true)}
              >
                <div className="aspect-video relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/placeholder.jpg';
                    }}
                    loading="lazy"
                  />
                  {video.duration && (
                    <span className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                      {video.duration}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-dark-text-primary line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1 truncate">
                    {video.channel_title || 'チャンネル名なし'}
                  </p>
                  <div className="flex justify-between items-center mt-1 text-xs text-gray-500 dark:text-dark-text-secondary">
                    <span>★{(video.avg_rating || 0).toFixed(1)}</span>
                    <span>{video.review_count || 0}件</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center text-gray-500 dark:text-dark-text-secondary py-6">
              レビューのある動画がありません
            </div>
          )}
        </div>
        
        {showMoreButtonUI}
      </div>
    );
  }

  // PC向け元のレイアウト
  return (
    <div>
      {sortControlUI}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.length > 0 ? (
          videos.map((video) => (
            <div
              key={video.id}
              className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleVideoClick(video, false)}
            >
              <div className="aspect-video relative">
                {playingVideoId === video.youtube_id ? (
                  <VideoPlayer
                    videoId={video.youtube_id}
                    width="100%"
                    height="100%"
                  />
                ) : (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/placeholder.jpg';
                    }}
                    loading="lazy"
                  />
                )}
              </div>
              <div
                className="p-4"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoClick(video, true);
                }}
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary truncate hover:text-blue-600 dark:hover:text-blue-400">
                  {video.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                  {video.channel_title || 'チャンネル名なし'}
                </p>
                <div className="flex justify-between items-center mt-2 text-sm text-gray-500 dark:text-dark-text-secondary">
                  <span>レビュー数: {video.review_count}</span>
                  <span>評価: ★{(video.avg_rating || 0).toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 dark:text-dark-text-secondary py-8">
            レビューのある動画がありません
          </div>
        )}
      </div>
      
      {showMoreButtonUI}
    </div>
  );
}