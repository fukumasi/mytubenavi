// src/components/home/FeaturedVideos.tsx

import React, { useEffect, useState } from 'react';
import { Video } from '@/types'; 
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import VideoPlayer from '../video/VideoPlayer';

interface FeaturedVideosProps {
  limit?: number;
  className?: string;
  title?: string;
  ratingThreshold?: number;
}

const FeaturedVideos: React.FC<FeaturedVideosProps> = ({
  limit = 6,
  className = "",
  title = "  ",
  ratingThreshold = 0
}) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleVideoClick = (video: Video, shouldNavigate: boolean = false) => {
    if (!video || !video.youtube_id) return;

    if (shouldNavigate) {
      navigate(`/video/${video.youtube_id}`);
      return;
    }
    
    setPlayingVideoId(prevId => prevId === video.youtube_id ? null : video.youtube_id);
  };

  useEffect(() => {
    const fetchFeaturedVideos = async () => {
      try {
        setLoading(true);
        // 評価データの代わりに、高評価の動画を直接取得する方法に変更
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select('*')
          .gt('avg_rating', ratingThreshold) // 評価が閾値より大きい動画のみ
          .order('avg_rating', { ascending: false })
          .limit(limit);

        if (videosError) {
          console.error('Error fetching featured videos:', videosError);
          setError('動画の読み込みに失敗しました');
          return;
        }
        
        if (!videosData || videosData.length === 0) {
          console.log('No featured videos found');
          setVideos([]);
          return;
        }

        console.log('Featured videos:', videosData);
        
        // 動画データを整形
        const featuredVideos = videosData.map(video => ({
          id: video.id,
          title: video.title || 'タイトルなし',
          youtube_id: video.youtube_id,
          review_count: video.review_count || 0,
          thumbnail: video.thumbnail || 
            `https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg` ||
            '/placeholder.jpg',
          channel_title: video.channel_title || 'チャンネル名なし',
          avg_rating: video.avg_rating || 0,
          rating: video.avg_rating || 0,
          description: video.description || '',
          view_count: video.view_count || 0,
          published_at: video.published_at || '',
          genre_id: video.genre_id || '',
          duration: video.duration || '',
          created_at: video.created_at || new Date().toISOString(),
          updated_at: video.updated_at || new Date().toISOString(),
          youtuber: video.youtuber
        } as Video));
        
        setVideos(featuredVideos);
      } catch (error) {
        console.error('Error fetching featured videos:', error);
        setError('動画の読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedVideos();
  }, [limit, ratingThreshold]);

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

  return (
    <div className={className}>
      {title && (
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.length > 0 ? (
          videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
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
                <h3 className="text-lg font-medium text-gray-900 truncate hover:text-blue-600">
                  {video.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {video.channel_title || 'チャンネル名なし'}
                </p>
                <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                  <span>評価: {video.avg_rating ? `★${video.avg_rating.toFixed(1)}` : '未評価'}</span>
                  <span>レビュー数: {video.review_count || 0}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-8">
            高評価の動画がありません
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedVideos;