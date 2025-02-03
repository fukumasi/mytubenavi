// src/components/home/LatestCommentVideos.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Video } from '@/types';
import VideoPlayer from '../video/VideoPlayer';
import { useNavigate } from 'react-router-dom';

export default function LatestCommentVideos() {
 const [videos, setVideos] = useState<Video[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
 const navigate = useNavigate();

 useEffect(() => {
   const fetchLatestCommentVideos = async () => {
     try {
       setLoading(true);
       const { data, error } = await supabase
         .from('videos')
         .select(`
           id,
           title,
           description,
           thumbnail,
           duration,
           view_count,
           rating,
           published_at,
           channel_title,
           youtube_id,
           genre_id,
           comment_count
         `)
         .order('comment_count', { ascending: false })
         .limit(6);

       if (error) throw error;

       if (data) {
         const formattedVideos: Video[] = data.map(video => ({
           id: video.id,
           title: video.title,
           description: video.description || '',
           thumbnail: video.thumbnail,
           duration: video.duration || '',
           viewCount: video.view_count,
           rating: video.rating || 0,
           publishedAt: video.published_at,
           channelTitle: video.channel_title,
           youtube_id: video.youtube_id,
           genre_id: video.genre_id,
           commentCount: video.comment_count || 0
         }));
         setVideos(formattedVideos);
       }
     } catch (error) {
       console.error('Error fetching latest comment videos:', error);
       setError('動画の読み込みに失敗しました');
     } finally {
       setLoading(false);
     }
   };

   fetchLatestCommentVideos();
 }, []);

 const handleVideoClick = (videoId: string, shouldNavigate: boolean = false) => {
   if (shouldNavigate) {
     navigate(`/video/${videoId}`);
     return;
   }
   setPlayingVideoId(prevId => prevId === videoId ? null : videoId);
 };

 if (loading) {
   return (
     <div className="flex justify-center items-center h-48">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
     </div>
   );
 }

 if (error) {
   return (
     <div className="text-center text-red-600 p-4">
       <p>{error}</p>
     </div>
   );
 }

 if (videos.length === 0) {
   return (
     <div className="text-center text-gray-500 p-4">
       <p>コメントの多い動画はありません</p>
     </div>
   );
 }

 return (
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
     {videos.map((video) => (
       <div
         key={video.id}
         className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
         onClick={() => handleVideoClick(video.youtube_id)}
       >
         <div className="aspect-video relative">
           {playingVideoId === video.youtube_id ? (
             <VideoPlayer 
               videoId={video.youtube_id}
               width="100%"
               height="100%"
             />
           ) : (
             <img
               src={video.thumbnail}
               alt={video.title}
               className="w-full h-full object-cover"
             />
           )}
         </div>
         <div 
           className="p-4"
           onClick={(e) => {
             e.stopPropagation();
             handleVideoClick(video.youtube_id, true);
           }}
         >
           <h3 className="text-lg font-medium text-gray-900 truncate hover:text-blue-600">
             {video.title}
           </h3>
           <p className="text-sm text-gray-500 mt-1">
             {video.channelTitle}
           </p>
           <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
             <span>コメント数: {video.commentCount}</span>
             <span>評価: {video.rating.toFixed(1)}</span>
           </div>
         </div>
       </div>
     ))}
   </div>
 );
}