// src/components/video/VideoRatingDisplay.tsx
import React from 'react';
import { useVideoRating } from '../../hooks/useVideoRating';
import { StarRating } from '../search/review/StarRating';

interface VideoRatingDisplayProps {
 videoId: string;
 showCount?: boolean;
 size?: 'sm' | 'md' | 'lg';
 className?: string;
}

export const VideoRatingDisplay: React.FC<VideoRatingDisplayProps> = ({
 videoId,
 showCount = true,
 size = 'md',
 className = '',
}) => {
 const { averageRating, reviewCount, isLoading } = useVideoRating(videoId);

 // サイズ設定
 const sizeClasses = {
   sm: 'text-xs',
   md: 'text-sm',
   lg: 'text-lg',
 };

 if (isLoading) {
   return <div className={`${sizeClasses[size]} ${className} animate-pulse bg-gray-200 h-5 w-28 rounded`}></div>;
 }

 return (
   <div className={`flex items-center ${sizeClasses[size]} ${className}`}>
     <div className="flex mr-1">
       <StarRating 
         rating={averageRating || 0} 
         readOnly 
         size={size} 
         showNumber={false} 
       />
     </div>
     {showCount && (
       <div className="flex items-center">
         <span className="ml-1 text-gray-600">
           {averageRating !== null ? averageRating.toFixed(1) : '-'}
         </span>
         <span className="mx-1 text-gray-400">|</span>
         <span className="text-gray-600">
           {reviewCount > 0 ? `${reviewCount}件` : 'レビューなし'}
         </span>
       </div>
     )}
   </div>
 );
};

export default VideoRatingDisplay;