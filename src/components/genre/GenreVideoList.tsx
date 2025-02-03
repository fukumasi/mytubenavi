// src/components/genre/GenreVideoList.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Video } from '@/types';
import { YouTubeAPI } from '@/lib/youtube';
import GenreSidebar from './GenreSidebar';
import AdsSection from '../home/AdsSection';

const genreNames: Record<string, string> = {
   music: '音楽',
   gaming: 'ゲーム', 
   entertainment: 'エンターテイメント',
   education: '教育',
   technology: 'テクノロジー',
   lifestyle: 'ライフスタイル',
   sports: 'スポーツ', 
   news: 'ニュース',
   'pets-and-animals': 'ペット・動物',
   others: 'その他',
   business: 'ビジネス',
   beauty: '美容',
   cars: '車',
   community: 'コミュニティ',
   creative: 'クリエイティブ',
   food: 'フード',
   'lifehack': 'ライフハック',
   information: '情報・知識',
   kids: 'キッズ'
};

type SortKey = 'publishedAt' | 'rating' | 'viewCount';

export default function GenreVideoList() {
   const { genre, subGenre } = useParams<{ genre: string; subGenre?: string }>();
   const navigate = useNavigate();
   const [sortKey, setSortKey] = useState<SortKey>('publishedAt');
   const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
   const [videos, setVideos] = useState<Video[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [page, setPage] = useState(1);
   const itemsPerPage = 20;
   const [hasMore, setHasMore] = useState(true);

   const _subGenreName = useMemo(() => {
       if(subGenre){
           return genreNames[subGenre || ''] || subGenre;
       }
       return "";
   }, [subGenre]);

   const fetchVideos = useCallback(async () => {
       if (!genre) return;

       try {
           setLoading(true);
           setError(null);

           const { data: genreData, error: genreError } = await supabase
               .from('genres')
               .select('id, name')
               .eq('slug', genre)
               .single();

           if (genreError || !genreData) {
               setError('ジャンルの取得に失敗しました');
               return;
           }

           let searchQuery = genreData.name;
           if (subGenre) {
               const { data: subGenreData, error: subGenreError } = await supabase
                   .from('genres')
                   .select('name')
                   .eq('slug', subGenre)
                   .eq('parent_genre_id', genreData.id)
                   .single();
           
               if (subGenreError || !subGenreData) {
                   setError('サブジャンルの取得に失敗しました');
                   return;
               }
               searchQuery = subGenreData.name;
           }

           const { videos } = await YouTubeAPI.searchVideos(
               searchQuery,
               itemsPerPage
           );
           if(videos){
               setVideos(prevVideos => page === 1 ? videos : [...prevVideos, ...videos]);
               if (videos.length < itemsPerPage) {
                   setHasMore(false);
               }
           } else {
               setHasMore(false);
           }
       } catch (err) {
           console.error('Error fetching videos:', err);
           setError('動画の取得に失敗しました');
           setHasMore(false);
       } finally {
           setLoading(false);
       }
   }, [genre, page, itemsPerPage, subGenre]);

   useEffect(() => {
       fetchVideos();
   }, [fetchVideos]);

   const genreName = genreNames[genre || ''] || genre;

   const handleSort = (key: SortKey) => {
       if (sortKey === key) {
           setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
       } else {
           setSortKey(key);
           setSortOrder('desc');
       }
   };

   const handleVideoClick = (videoId: string) => {
       navigate(`/video/${videoId}`);
   };
   
   const handleSubGenreClick = (slug: string) => {
       navigate(`/genre/${genre}/${slug}`);
   };

   const sortVideos = (a: any, b: any, sortKey: SortKey): number => {
       if (sortKey === 'publishedAt') {
           return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
       }
       return (b[sortKey] || 0) - (a[sortKey] || 0);
   };
     
   const sortedVideos = useMemo(() => {
       return [...videos].sort((a, b) => 
           sortOrder === 'desc' ? sortVideos(a, b, sortKey) : -sortVideos(a, b, sortKey)
       );
   }, [videos, sortKey, sortOrder]);
 
   const handleLoadMore = () => {
       setPage(prevPage => prevPage + 1);
   };

   if (loading && page === 1) {
       return (
           <div className="flex justify-center items-center min-h-[400px]">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
           </div>
       );
   }

   if (error) {
       return (
           <div className="text-center py-8 text-red-600">
               <p>{error}</p>
           </div>
       );
   }

   return (
       <div className="container mx-auto px-4 py-8">
           <h1 className="text-3xl font-bold text-gray-900 mb-8">
               {genreName}の動画一覧 {subGenre && (
                   <>
                       <span className="mx-2 text-gray-400">/</span>
                       <span className="text-2xl">{_subGenreName}</span>
                   </>
               )}
           </h1>
           <div className="flex gap-8">
               <aside className="hidden lg:block w-64 flex-shrink-0">
                   <GenreSidebar parentGenre={genre || ''} activeGenre={subGenre} onSubGenreClick={handleSubGenreClick} />
               </aside>

               <div className="flex-grow">
                   <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                       {sortedVideos.length === 0 ? (
                           <div className="p-8 text-center text-gray-500">動画が見つかりませんでした</div>
                       ) : (
                           <div className="overflow-x-auto">
                               <table className="min-w-full divide-y divide-gray-200">
                                   <thead className="bg-gray-50">
                                       <tr>
                                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                               動画情報
                                           </th>
                                           <th
                                               className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                                               onClick={() => handleSort('publishedAt')}
                                           >
                                               アップ日 {sortKey === 'publishedAt' && (sortOrder === 'desc' ? '▼' : '▲')}
                                           </th>
                                           <th
                                               className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                                               onClick={() => handleSort('rating')}
                                           >
                                               評価 {sortKey === 'rating' && (sortOrder === 'desc' ? '▼' : '▲')}
                                           </th>
                                           <th
                                               className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                                               onClick={() => handleSort('viewCount')}
                                           >
                                               視聴回数 {sortKey === 'viewCount' && (sortOrder === 'desc' ? '▼' : '▲')}
                                           </th>
                                       </tr>
                                   </thead>
                                   <tbody className="bg-white divide-y divide-gray-200">
                                       {sortedVideos.map((video) => (
                                           <tr
                                               key={video.id ? video.id : video.youtube_id}
                                               onClick={() => handleVideoClick(video.id)}
                                               className="hover:bg-gray-50 cursor-pointer"
                                           >
                                               <td className="px-6 py-4">
                                                   <div className="flex items-start space-x-4">
                                                       <img
                                                           src={video.thumbnail}
                                                           alt={video.title}
                                                           className="w-40 h-24 object-cover rounded"
                                                       />
                                                       <div>
                                                           <div className="text-sm font-medium text-gray-900">
                                                               {video.title}
                                                           </div>
                                                           <div className="text-sm text-gray-500">
                                                               {video.channelTitle}
                                                           </div>
                                                       </div>
                                                   </div>
                                               </td>
                                               <td className="px-6 py-4">{new Date(video.publishedAt).toLocaleDateString('ja-JP')}</td>
                                               <td className="px-6 py-4">{video.rating.toFixed(1)}</td>
                                               <td className="px-6 py-4">{(video.viewCount / 10000).toFixed(1)}万</td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                           </div>
                       )}
                       {hasMore && (
                           <div className="text-center py-4">
                               <button 
                                   onClick={handleLoadMore}
                                   className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition"
                                   disabled={loading}
                               >
                                   {loading ? '読み込み中...' : 'さらに読み込む'}
                               </button>
                           </div>
                       )}
                   </div>
               </div>

               <aside className="hidden lg:block w-64 flex-shrink-0">
                   <div className="sticky top-4">
                       <AdsSection />
                   </div>
               </aside>
           </div>
       </div>
   );
}