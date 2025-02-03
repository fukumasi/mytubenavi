// src/components/home/VideoCard.tsx

import { Star, User } from 'lucide-react';
import { Video } from '@/types';

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
 rating
}: VideoCardProps) {
 const formatViews = (count: number) => {
   if (count >= 10000) {
     return `${(count / 10000).toFixed(1)}万回`;
   }
   return `${count.toLocaleString()}回`;
 };

 return (
   <div className="group cursor-pointer" data-video-id={videoId}>
     <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
       <img
         src={thumbnail}
         alt={title}
         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
       />
     </div>

     <div className="flex gap-3">
       <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-100">
         <User className="w-full h-full text-gray-400 p-1" />
       </div>

       <div className="flex-grow min-w-0">
         <h3 className="font-medium text-sm line-clamp-2 mb-1 text-gray-900">
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

