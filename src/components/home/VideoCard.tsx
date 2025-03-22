// src/components/home/VideoCard.tsx
import { Star, MessageSquare, Calendar, Eye } from 'lucide-react';
import { Video } from '@/types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface VideoCardProps {
  videoId: string;
  thumbnail: string;
  title: string;
  channelTitle?: string;
  viewCount?: number;
  rating?: number;
  reviewCount?: number;
  publishedAt?: string;
  video?: Video;
  viewedAt?: string;
  onImageError?: () => void;
}

export default function VideoCard({
  videoId,
  thumbnail,
  title,
  channelTitle,
  viewCount,
  rating,
  reviewCount = 0,
  publishedAt,
  video,
  onImageError
}: VideoCardProps) {
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  const handleVideoClick = () => {
    navigate(`/video/${video?.youtube_id || videoId}`);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null; // 無限ループを防ぐ
    target.src = '/placeholder.jpg';
    setImgError(true);
    onImageError?.();
  };

  // 日付をフォーマット（YYYY-MM-DD）
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '-');
  };

  const formatViews = (count?: number) => {
    if (!count) return '-';
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    return count.toLocaleString();
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* 上段：サムネイルと動画タイトル */}
      <div className="flex flex-row border-b border-gray-100">
        {/* サムネイル - 左側に配置 */}
        <div 
          className="relative w-32 h-20 cursor-pointer" 
          onClick={handleVideoClick}
        >
          <img
            src={imgError ? '/placeholder.jpg' : (thumbnail || '/placeholder.jpg')}
            alt={title}
            className="w-full h-full object-cover"
            onError={handleImageError}
            loading="lazy"
          />
          {video?.duration && (
            <span className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
              {video.duration}
            </span>
          )}
        </div>
        
        {/* タイトル - 右側に配置 */}
        <div 
          className="flex-1 p-2 cursor-pointer" 
          onClick={handleVideoClick}
        >
          <h3 className="font-medium text-xs line-clamp-3 text-gray-900">
            {title}
          </h3>
          {channelTitle && (
            <div className="text-xs text-gray-600 mt-1 line-clamp-1">
              {channelTitle}
            </div>
          )}
        </div>
      </div>
      
      {/* 下段：評価、レビュー数、投稿日 */}
      <div className="flex justify-between px-2 py-1 text-xs text-gray-500 bg-gray-50">
        {/* 星評価 */}
        <div className="flex items-center">
          <Star className="h-3 w-3 text-yellow-400 mr-1" />
          <span>{rating ? rating.toFixed(1) : '-'}</span>
        </div>
        
        {/* レビュー数 */}
        <div className="flex items-center">
          <MessageSquare className="h-3 w-3 mr-1" />
          <span>{reviewCount}</span>
        </div>
        
        {/* 再生回数 */}
        <div className="flex items-center">
          <Eye className="h-3 w-3 mr-1" />
          <span>{formatViews(viewCount)}</span>
        </div>
        
        {/* 投稿日 */}
        <div className="flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          <span>{formatDate(publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}