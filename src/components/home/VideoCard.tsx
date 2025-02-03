// src/components/home/VideoCard.tsx
import { Star, User } from 'lucide-react';
import { Video } from '@/types';
import VideoPlayer from '../video/VideoPlayer';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface VideoCardProps {
videoId: string;
thumbnail: string;
title: string;
channelName: string;
views: number;
rating: number;
video?: Video;
}

export default function VideoCard({
videoId,
thumbnail,
title,
channelName,
views,
rating,
video
}: VideoCardProps) {
const [isPlaying, setIsPlaying] = useState(false);
const navigate = useNavigate();

const formatViews = (count: number) => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万回`;
  }
  return `${count.toLocaleString()}回`;
};

const handleVideoClick = () => {
  setIsPlaying(prev => !prev);
};

const handleTitleClick = () => {
  navigate(`/video/${video?.youtube_id || videoId}`);
};

return (
  <div 
    className="group cursor-pointer" 
    data-video-id={videoId}
    onClick={handleVideoClick}
  >
    <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
      {(video?.youtube_id || isPlaying) ? (
        <VideoPlayer
          videoId={video?.youtube_id || videoId}
          width="100%"
          height="100%"
          onError={(event) => console.error('Video player error:', event)}
        />
      ) : (
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      )}
    </div>

    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-100">
        <User className="w-full h-full text-gray-400 p-1" />
      </div>

      <div 
        className="flex-grow min-w-0"
        onClick={(e) => {
          e.stopPropagation();
          handleTitleClick();
        }}
      >
        <h3 className="font-medium text-sm line-clamp-2 mb-1 text-gray-900 hover:text-blue-600">
          {title}
        </h3>

        <div className="text-xs text-gray-600">
          <p className="line-clamp-1">{channelName}</p>
          <div className="flex items-center space-x-1">
            <span>{formatViews(views)}視聴</span>
            <span>•</span>
            <div className="flex items-center">
              <Star className="w-3 h-3 text-yellow-400 mr-0.5" />
              <span>{rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}