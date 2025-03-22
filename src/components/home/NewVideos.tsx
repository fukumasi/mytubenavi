// src/components/home/NewVideos.tsx
import React, { useEffect, useState } from 'react';
import { Video } from '@/types';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  onClick: (videoId: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  const [imgError, setImgError] = useState(false);
  
  const handleImageError = () => {
    setImgError(true);
  };

  const handleClick = () => {
    onClick(video.youtube_id || video.id);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col"
      onClick={handleClick}
    >
      <div className="aspect-video relative">
        <img
          src={imgError ? '/placeholder.jpg' : (video.thumbnail || video.thumbnail_url || '/placeholder.jpg')}
          alt={video.title}
          className="w-full h-full object-cover"
          onError={handleImageError}
          loading="lazy"
        />
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
            {video.duration}
          </div>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-lg font-medium text-gray-900 line-clamp-2 hover:text-blue-600">
          {video.title}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {video.channel_title}
        </p>
        <div className="flex justify-between items-center mt-auto pt-2 text-sm text-gray-500">
          <span>{video.view_count ? `${video.view_count.toLocaleString()} 回視聴` : ''}</span>
          {(video.rating || video.avg_rating) && (
            <span>評価: {((video.rating || video.avg_rating) as number).toFixed(1)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const NewVideos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNewVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(6);

        if (error) throw error;

        if (data && data.length > 0) {
          setVideos(data);
        } else {
          // バックアップ：データが無い場合は空配列を設定
          setVideos([]);
        }
      } catch (err) {
        console.error('Error fetching new videos:', err);
        setError('新着動画の取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchNewVideos();
  }, []);

  const handleVideoClick = (videoId: string) => {
    if (videoId) {
      navigate(`/video/${videoId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" aria-label="読み込み中" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">新着動画</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">新着動画</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700 text-center">
          新着動画はありません
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">新着動画</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <VideoCard 
            key={video.youtube_id || video.id} 
            video={video} 
            onClick={handleVideoClick}
          />
        ))}
      </div>
    </div>
  );
};

export default NewVideos;