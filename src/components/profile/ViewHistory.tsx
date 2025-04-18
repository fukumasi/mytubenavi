// src/components/profile/ViewHistory.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Clock, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ProfileLayout from './ProfileLayout';
import type { Video } from '@/types';

// 視聴履歴用に拡張した型を定義
interface HistoryVideo extends Video {
   viewed_at?: string;
}

export default function ViewHistory() {
   const [history, setHistory] = useState<HistoryVideo[]>([]);
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
                   .select('*, videos(id, youtube_id, title, thumbnail, channel_title, published_at, view_count, rating, duration)')
                   .eq('user_id', user.id)
                   .order('viewed_at', { ascending: false });

               if (response.error) {
                   console.error('Supabase Error:', response.error);
                   throw response.error;
               }

               const formattedVideos: HistoryVideo[] = response.data
                   ?.filter(history => history.videos !== null)
                   .map(history => ({
                       id: history.videos.id,
                       youtube_id: history.videos.youtube_id || '',  // 正しく取得
                       title: history.videos.title || '不明な動画',
                       description: '', // 必須プロパティ
                       thumbnail: history.videos.thumbnail || '/placeholder.jpg',
                       channel_title: history.videos.channel_title || '不明なチャンネル',
                       published_at: history.videos.published_at,
                       view_count: history.videos.view_count || 0,
                       rating: history.videos.rating,
                       duration: history.videos.duration,
                       review_count: 0, // 必須プロパティ
                       viewed_at: history.viewed_at // 視聴時間を追加
                   })) || [];

               setHistory(formattedVideos);
           } catch (err) {
               console.error('視聴履歴の取得エラー:', err);
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
                   <div className="text-center py-8">
                       <p className="text-gray-600">視聴履歴はありません</p>
                       <button
                           onClick={() => navigate('/')}
                           className="mt-4 text-indigo-600 hover:text-indigo-500"
                       >
                           動画を探す
                       </button>
                   </div>
               ) : (
                   <div className="space-y-4">
                       {history.map((video) => (
                           <div
                               key={`${video.id}-${video.viewed_at}`}
                               onClick={() => navigate(`/video/${video.youtube_id}`)}
                               className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                           >
                               <div className="flex p-4">
                                   <div className="relative flex-shrink-0 w-48">
                                       <img
                                           src={video.thumbnail || '/placeholder.jpg'}
                                           alt={video.title}
                                           className="w-full h-27 object-cover rounded-lg"
                                           onError={(e) => {
                                               (e.target as HTMLImageElement).src = '/placeholder.jpg';    
                                           }}
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
                                           <span className="font-medium">{video.channel_title}</span>      
                                       </div>

                                       <div className="flex items-center space-x-4 text-sm text-gray-500"> 
                                           <div className="flex items-center">
                                               <Eye className="h-4 w-4 mr-1" />
                                               <span>{video.view_count ? `${(video.view_count / 10000).toFixed(1)}万回視聴` : '再生回数不明'}</span>
                                           </div>
                                           {video.rating !== undefined && (
                                               <div className="flex items-center">
                                                   <Star className="h-4 w-4 text-yellow-400 mr-1" />       
                                                   <span>{video.rating.toFixed(1)}</span>
                                               </div>
                                           )}
                                           <div className="flex items-center">
                                               <Clock className="h-4 w-4 mr-1" />
                                               <span>視聴日: {new Date(video.viewed_at || video.published_at).toLocaleDateString('ja-JP')}</span>
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