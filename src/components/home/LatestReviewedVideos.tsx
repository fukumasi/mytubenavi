import { useEffect, useState } from 'react';
import { getVideosByReviewCount } from '@/lib/supabase';
import { Video } from '@/types';
import VideoPlayer from '../video/VideoPlayer';
import { useNavigate } from 'react-router-dom';

export default function LatestReviewedVideos() {
 const [videos, setVideos] = useState<Video[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
 const navigate = useNavigate();

 const handleVideoClick = (video: Video, shouldNavigate: boolean = false) => {
   if (!video || !video.youtube_id) return;

   if (shouldNavigate) {
     navigate(`/video/${video.youtube_id}`);
     return;
   }
   
   setPlayingVideoId(prevId => prevId === video.youtube_id ? null : video.youtube_id);
 };

 useEffect(() => {
   const fetchVideos = async () => {
     try {
       setLoading(true);
       // 新しく作成したgetVideosByReviewCount関数を使用
       const videosData = await getVideosByReviewCount(6);
       console.log('Found reviewed videos:', videosData.length);
       setVideos(videosData);
     } catch (err) {
       console.error('Error fetching videos:', err);
       setError('動画の読み込みに失敗しました');
     } finally {
       setLoading(false);
     }
   };

   fetchVideos();
 }, []);

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

 return (
   <div>
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
       {videos.length > 0 ? (
         videos.map((video) => (
           <div
             key={video.id}
             className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
             onClick={() => handleVideoClick(video, false)}
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
                   onError={(e) => {
                     const target = e.target as HTMLImageElement;
                     target.onerror = null;
                     target.src = '/placeholder.jpg';
                   }}
                 />
               )}
             </div>
             <div
               className="p-4"
               onClick={(e) => {
                 e.stopPropagation();
                 handleVideoClick(video, true);
               }}
             >
               <h3 className="text-lg font-medium text-gray-900 truncate hover:text-blue-600">
                 {video.title}
               </h3>
               <p className="text-sm text-gray-500 mt-1">
                 {video.channel_title || 'チャンネル名なし'}
               </p>
               <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                 <span>レビュー数: {video.review_count}</span>
                 <span>評価: ★{(video.avg_rating || 0).toFixed(1)}</span>
               </div>
             </div>
           </div>
         ))
       ) : (
         <div className="col-span-full text-center text-gray-500 py-8">
           レビューのある動画がありません
         </div>
       )}
     </div>
   </div>
 );
}