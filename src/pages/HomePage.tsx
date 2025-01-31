// src/pages/HomePage.tsx

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import GenreList from '../components/home/GenreList';
import VideoCard from '../components/home/VideoCard';
import { getRecentVideos, getPopularVideos } from '../lib/supabase';
import type { Video } from '../types';

interface SkeletonLoaderProps {
  count?: number;
}

const SkeletonLoader = ({ count = 5 }: SkeletonLoaderProps) => (
  <div className="flex space-x-4">
    {Array(count).fill(null).map((_, i) => (
      <div key={i} className="flex-none w-64 animate-pulse">
        <div className="bg-gray-200 aspect-video rounded-lg mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    ))}
  </div>
);

type VideoSectionId = 'recommended' | 'recent' | 'popular';

export default function HomePage() {
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [popularVideos, setPopularVideos] = useState<Video[]>([]);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoreCount, setShowMoreCount] = useState({
    recommended: 5,
    recent: 5,
    popular: 5
  });

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        const [recent, popular] = await Promise.all([
          getRecentVideos(20),
          getPopularVideos(20)
        ]);
        setRecentVideos(recent);
        setPopularVideos(popular);
        setRecommendedVideos(popular.slice(0, 5));
      } catch (error) {
        console.error('動画の取得に失敗しました:', error);
        setError('動画の読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleShowMore = (section: VideoSectionId) => {
    setShowMoreCount(prev => ({
      ...prev,
      [section]: prev[section] + 5
    }));
  };

  if (error) {
    return (
      <div className="text-center text-gray-600 py-8">
        <p>{error}</p>
      </div>
    );
  }

  const sections = [
    { id: 'recommended', title: 'おすすめ動画', videos: recommendedVideos },
    { id: 'recent', title: '新着動画', videos: recentVideos },
    { id: 'popular', title: '人気動画', videos: popularVideos }
  ] as const;

  return (
    <div className="space-y-8 py-8">
      <section>
        <h2 className="text-xl font-bold mb-4">ジャンルから探す</h2>
        <GenreList />
      </section>

      {sections.map(({ id, title, videos }) => (
        <section key={id}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{title}</h2>
            {videos.length > showMoreCount[id] && (
              <button
                onClick={() => handleShowMore(id)}
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
              >
                もっと見る
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
          <div className="relative">
            <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              {loading ? (
                <SkeletonLoader />
              ) : (
                <div className="flex space-x-4">
                  {videos.slice(0, showMoreCount[id]).map((video) => (
                    <div key={video.id} className="flex-none w-64">
                      <VideoCard
                        videoId={video.id}
                        thumbnail={video.thumbnail}
                        title={video.title}
                        channelName={video.channelTitle}
                        views={video.viewCount}
                        rating={video.rating}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}