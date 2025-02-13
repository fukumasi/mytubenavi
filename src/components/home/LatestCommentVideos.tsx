// src/components/home/LatestCommentVideos.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Video } from '@/types';
import VideoPlayer from '../video/VideoPlayer';
import { useNavigate } from 'react-router-dom';

export default function LatestCommentVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleVideoClick = (videoId: string, shouldNavigate: boolean = false) => {
    if (shouldNavigate) {
      navigate(`/video/${videoId}`);
      return;
    }
    setPlayingVideoId(prevId => prevId === videoId ? null : videoId);
  };

  useEffect(() => {
    const fetchLatestCommentVideos = async () => {
      try {
        setLoading(true);
        console.log('Fetching videos with comments...');

        const { data, error } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            description,
            thumbnail,
            duration,
            view_count,
            published_at,
            channel_title,
            youtube_id,
            genre_id,
            mytubenavi_comment_count,
            review_count,
            avg_rating
          `)
          .gt('mytubenavi_comment_count', 0)
          .order('mytubenavi_comment_count', { ascending: false })
          .limit(6);

        console.log('Query result:', { data, error });

        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          console.log('No videos found with comments');
          setVideos([]);
          return;
        }

        const formattedVideos: Video[] = data.map(video => {
          console.log('Processing video:', video.id, 'Comment count:', video.mytubenavi_comment_count);
          
          // サムネイルURLの処理を追加
          const thumbnailUrl = video.thumbnail?.startsWith('http') 
            ? video.thumbnail 
            : `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`;
          
          return {
            id: video.id,
            title: video.title,
            description: video.description || '',
            thumbnail: thumbnailUrl,
            duration: video.duration || '',
            viewCount: video.view_count,
            publishedAt: video.published_at,
            channelTitle: video.channel_title,
            youtube_id: video.youtube_id,
            genre_id: video.genre_id,
            mytubenavi_comment_count: video.mytubenavi_comment_count || 0,
            review_count: video.review_count || 0,
            avg_rating: video.avg_rating || 0,
            commentCount: video.mytubenavi_comment_count || 0,
            likeCount: 0
          };
        });

        console.log('Formatted videos:', formattedVideos);
        setVideos(formattedVideos);

      } catch (err) {
        console.error('Error details:', err);
        setError('動画の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchLatestCommentVideos();
  }, []);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.length > 0 ? (
        videos.map((video) => (
          <div
            key={video.id}
            className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleVideoClick(video.youtube_id)}
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
                  target.onerror = null; // 無限ループを防ぐ
                  target.src = '/placeholder.jpg'; // デフォルト画像を表示
                }}
              />
              )}
            </div>
            <div 
              className="p-4"
              onClick={(e) => {
                e.stopPropagation();
                handleVideoClick(video.youtube_id, true);
              }}
            >
              <h3 className="text-lg font-medium text-gray-900 truncate hover:text-blue-600">
                {video.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {video.channelTitle}
              </p>
              <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                <span>コメント数: {video.mytubenavi_comment_count}</span>
                <span>評価: ★{(video.avg_rating || 0).toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full text-center text-gray-500 py-8">
          コメントのある動画がありません
        </div>
      )}
    </div>
  );
}