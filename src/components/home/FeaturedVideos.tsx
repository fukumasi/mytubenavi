import React, { useEffect, useState } from 'react';
import { Video } from '@/types'; 
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const FeaturedVideos: React.FC = () => {
const [videos, setVideos] = useState<Video[]>([]);
const [loading, setLoading] = useState(true);
const navigate = useNavigate();

const handleVideoClick = (video: Video) => {
  if (video && video.youtube_id) {
    navigate(`/video/${video.youtube_id}`);
  }
};

useEffect(() => {
  const fetchFeaturedVideos = async () => {
    try {
      // 評価データの代わりに、高評価の動画を直接取得する方法に変更
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .gt('avg_rating', 0) // 評価が0より大きい動画のみ
        .order('avg_rating', { ascending: false })
        .limit(6);

      if (videosError) {
        console.error('Error fetching featured videos:', videosError);
        setVideos([]);
        setLoading(false);
        return;
      }
      
      if (!videosData || videosData.length === 0) {
        console.log('No featured videos found');
        setVideos([]);
        setLoading(false);
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
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  fetchFeaturedVideos();
}, []);

if (loading) {
  return (
    <div className="flex justify-center items-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );
}

return (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {videos.length > 0 ? (
      videos.map((video) => (
        <div
          key={video.id}
          className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleVideoClick(video)}
        >
          <div className="aspect-video relative">
            <img
              src={video.thumbnail || `/placeholder.jpg`}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '/placeholder.jpg';
              }}
            />
          </div>
          <div className="p-4">
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
      <div className="col-span-3 text-center text-gray-500">最近のアクティビティはありません</div>
    )}
  </div>
);
};

export default FeaturedVideos;