// src/components/home/VideoCard.tsx
import { Star, Eye, Clock } from 'lucide-react';
import { Video } from '@/types';
import VideoPlayer from '../video/VideoPlayer';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface VideoCardProps {
 videoId: string;
 thumbnail: string;
 title: string;
 channelTitle?: string;
 viewCount?: number;
 rating?: number;
 video?: Video;
 viewedAt?: string;
}

export default function VideoCard({
 videoId,
 thumbnail,
 title,
 channelTitle,
 viewCount,
 rating,
 video,
 viewedAt
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
     className="group cursor-pointer bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow" 
     data-video-id={videoId}
     onClick={handleVideoClick}
   >
     <div className="relative aspect-video rounded-lg overflow-hidden">
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
       {video?.duration && (
         <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
           {video.duration}
         </span>
       )}
     </div>

     <div className="p-4">
       <div 
         onClick={(e) => {
           e.stopPropagation();
           handleTitleClick();
         }}
       >
         <h3 className="font-medium text-sm line-clamp-2 mb-2 text-gray-900 hover:text-blue-600">
           {title}
         </h3>

         {channelTitle && (
           <div className="text-sm text-gray-600 mb-2">
             <span className="font-medium">{channelTitle}</span>
           </div>
         )}

         <div className="flex items-center space-x-4 text-sm text-gray-500">
           {viewCount !== undefined && (
             <div className="flex items-center">
               <Eye className="h-4 w-4 mr-1" />
               <span>{formatViews(viewCount)}</span>
             </div>
           )}
           {rating !== undefined && (
             <div className="flex items-center">
               <Star className="h-4 w-4 text-yellow-400 mr-1" />
               <span>{rating.toFixed(1)}</span>
             </div>
           )}
           {viewedAt && (
             <div className="flex items-center">
               <Clock className="h-4 w-4 mr-1" />
               <span>{new Date(viewedAt).toLocaleDateString('ja-JP')}</span>
             </div>
           )}
         </div>
       </div>
     </div>
   </div>
 );
}