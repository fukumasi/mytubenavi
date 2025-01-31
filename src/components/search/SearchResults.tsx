import { useNavigate } from 'react-router-dom';
import { Star, Eye, Clock, User, CheckCircle } from 'lucide-react';
import type { Video } from '../../types';

interface SearchResultsProps {
  videos: Video[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function SearchResults({
  videos,
  loading,
  error,
  currentPage,
  totalPages,
  onPageChange,
}: SearchResultsProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">検索結果が見つかりませんでした。</p>
      </div>
    );
  }

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '00:00';

    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    const parts: string[] = [];
    if (hours) parts.push(hours.padStart(2, '0'));
    parts.push((minutes || '0').padStart(2, '0'));
    parts.push((seconds || '0').padStart(2, '0'));

    return parts.join(':');
  };

  return (
    <div className="space-y-6">
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
                  {formatDuration(video.duration)}
                </span>
              </div>

              <div className="ml-4 flex-grow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {video.title}
                </h3>

                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <User className="h-4 w-4 mr-1" />
                  <span className="font-medium">{video.channelTitle}</span>
                  <CheckCircle className="h-4 w-4 ml-1 text-blue-500" />
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    <span>{(video.viewCount / 10000).toFixed(1)}万回視聴</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span>{video.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      {video.publishedAt
                        ? new Date(video.publishedAt).toLocaleDateString('ja-JP')
                        : '日付不明'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-8">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>

          <div className="flex items-center space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  currentPage === page
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
