// src/components/home/PopularVideos.tsx
import React, { useEffect, useState } from 'react';
import { Video } from '@/types';
import { getPopularVideosByRating } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

const PopularVideos: React.FC = () => {
   const [videos, setVideos] = useState<Video[]>([]);
   const [loading, setLoading] = useState(true);
   const navigate = useNavigate();

   useEffect(() => {
       const fetchPopularVideos = async () => {
           try {
               const data = await getPopularVideosByRating(10);
               setVideos(data);
           } catch (error) {
               console.error('Error fetching popular videos:', error);
           } finally {
               setLoading(false);
           }
       };

       fetchPopularVideos();
   }, []);

   const handleVideoClick = (videoId: string | null) => {
       if (videoId) {
           navigate(`/video/${videoId}`);
       }
   };

   if (loading) {
       return (
           <div className="flex justify-center items-center h-48">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
           </div>
       );
   }

   return (
       <div className="space-y-4">
           <h2 className="text-xl font-bold text-gray-900">注目の動画</h2>
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
               {videos.map((video) => (
                   video.youtube_id && video.youtube_id !== '' ? (
                       <div
                           key={video.id}
                           className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                           onClick={() => handleVideoClick(video.youtube_id)}
                       >
                           <div className="aspect-video relative">
                               <img
                                   src={video.thumbnail}
                                   alt={video.title}
                                   className="w-full h-full object-cover"
                               />
                           </div>
                           <div className="p-4">
                               <h3 className="text-lg font-medium text-gray-900 truncate hover:text-blue-600">
                                   {video.title}
                               </h3>
                               <p className="text-sm text-gray-500 mt-1">
                                   {video.channelTitle}
                               </p>
                               <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                                   <span>評価: ★{video.avg_rating?.toFixed(1) || '未評価'}</span>
                                   <span>レビュー数: {video.review_count || 0}</span>
                               </div>
                           </div>
                       </div>
                   ) : null
               ))}
           </div>
       </div>
   );
};

export default PopularVideos;