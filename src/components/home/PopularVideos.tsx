// src/components/home/PopularVideos.tsx
import React, { useEffect, useState } from 'react';
import { Video } from '@/types';
import { supabase } from '@/lib/supabase';
import VideoCard from './VideoCard';

const PopularVideos: React.FC = () => {
 const [videos, setVideos] = useState<Video[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   const fetchPopularVideos = async () => {
     try {
       const { data, error } = await supabase
         .from('videos')
         .select('*')
         .order('rating', { ascending: false })
         .limit(6);

       if (error) throw error;

       const popularVideos = data.map(video => ({
         id: video.id,
         title: video.title,
         description: video.description,
         thumbnail: video.thumbnail,
         duration: video.duration,
         viewCount: video.view_count,
         rating: video.rating,
         publishedAt: video.published_at,
         channelTitle: video.channel_title,
         youtubeId: video.youtube_id,
         commentCount: video.comment_count || 0,
         genre: video.genre
       }));

       setVideos(popularVideos);
     } catch (error) {
       console.error('Error fetching popular videos:', error);
     } finally {
       setLoading(false);
     }
   };

   fetchPopularVideos();
 }, []);

 if (loading) {
   return (
     <div className="flex justify-center items-center h-48">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
     </div>
   );
 }

 return (
   <div className="space-y-4">
     <h2 className="text-xl font-bold text-gray-900">人気動画</h2>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
       {videos.map((video) => (
         <VideoCard 
           key={video.id}
           videoId={video.id}
           thumbnail={video.thumbnail}
           title={video.title}
           channelName={video.channelTitle}
           views={video.viewCount}
           rating={video.rating}
         />
       ))}
     </div>
   </div>
 );
};

export default PopularVideos;