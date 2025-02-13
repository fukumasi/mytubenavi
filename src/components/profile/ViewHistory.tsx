// src/components/profile/ViewHistory.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ProfileLayout from './ProfileLayout';
import type { Video } from '../../types';

export default function ViewHistory() {
   const [history, setHistory] = useState<Video[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const navigate = useNavigate();

   useEffect(() => {
       async function fetchViewHistory() {
           try {
               setLoading(true);
               const { data: { user } } = await supabase.auth.getUser();

               if (!user) {
                   throw new Error('ユーザーが認証されていません');
               }

               const response = await supabase
                   .from('view_history')
                   .select('*, videos(id, title, thumbnail, channel_title, published_at, view_count, rating, duration)')
                   .eq('user_id', user.id)
                   .order('viewed_at', { ascending: false });

               if (response.error) {
                   console.error('Supabase Error:', response.error);
                   throw response.error;
               }

               const formattedVideos: Video[] = response.data
                   ?.filter(history => history.videos !== null)
                   .map(history => ({
                       id: history.videos.id,
                       title: history.videos.title,
                       thumbnail: history.videos.thumbnail,
                       channelTitle: history.videos.channel_title,
                       publishedAt: history.viewed_at,
                       viewCount: history.videos.view_count,
                       rating: history.videos.rating,
                       duration: history.videos.duration
                   })) || [];

               setHistory(formattedVideos);
           } catch (err) {
               setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
           } finally {
               setLoading(false);
           }
       }

       fetchViewHistory();
   }, []);

   if (loading) {
       return (
           <ProfileLayout>
               <div className="flex justify-center items-center min-h-[200px]">
                   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
               </div>
           </ProfileLayout>
       );
   }

   if (error) {
       return (
           <ProfileLayout>
               <div className="text-center py-8 text-red-600">
                   <p>{error}</p>
                   <button
                       onClick={() => window.location.reload()}
                       className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                   >
                       再読み込み
                   </button>
               </div>
           </ProfileLayout>
       );
   }

   return (
       <ProfileLayout>
           <div className="space-y-6">
               <div className="flex justify-between items-center">
                   <h2 className="text-xl font-semibold text-gray-900">視聴履歴</h2>
                   <span className="text-sm text-gray-500">
                       {!loading && !error && `${history.length}件の動画`}
                   </span>
               </div>
               {history.length === 0 ? (
                   <p className="text-center text-gray-600">視聴履歴はありません</p>
               ) : (
                   <div className="space-y-4">
                       {history.map((video) => (
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
                                       {video.duration && (
                                           <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                               {video.duration}
                                           </span>
                                       )}
                                   </div>

                                   <div className="ml-4 flex-grow">
                                       <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
                                           {video.title}
                                       </h3>

                                       <div className="flex items-center text-sm text-gray-600 mb-2">
                                           <span className="font-medium">{video.channelTitle}</span>
                                       </div>

                                       <div className="flex items-center space-x-4 text-sm text-gray-500">
                                           <div className="flex items-center">
                                               <Eye className="h-4 w-4 mr-1" />
                                               <span>{(video.viewCount / 10000).toFixed(1)}万回視聴</span>
                                           </div>
                                           {video.rating !== undefined && (
                                               <div className="flex items-center">
                                                   <Clock className="h-4 w-4 text-yellow-400 mr-1" />
                                                   <span>{video.rating.toFixed(1)}</span>
                                               </div>
                                           )}
                                           <div className="flex items-center">
                                               <Clock className="h-4 w-4 mr-1" />
                                               <span>{new Date(video.publishedAt).toLocaleDateString('ja-JP')}</span>
                                           </div>
                                       </div>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               )}
           </div>
       </ProfileLayout>
   );
}