
import { useNavigate } from 'react-router-dom';
import { Eye, Clock } from 'lucide-react';
import type { Video } from '../../types';

interface ViewHistoryProps {
  videos: Video[];
  loading: boolean;
  error: string | null;
}

export default function ViewHistory({ videos, loading, error }: ViewHistoryProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">視聴履歴はありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <div
          key={video.id}
          onClick={() => navigate(`/video/${video.id}`)}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex p-4">
            <div className="relative flex-shrink-0 w-48">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-27 object-cover rounded-lg"
              />
              <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {video.duration}
              </span>
            </div>
            
            <div className="ml-4 flex-grow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {video.title}
              </h3>
              
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <span className="font-medium">{video.channelTitle}</span>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  <span>{(video.viewCount / 10000).toFixed(1)}万回視聴</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{new Date(video.publishedAt).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}