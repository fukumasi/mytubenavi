// src/components/home/VideoList.tsx
import React, { useState } from 'react';
import { Table } from '../ui/table';
import { Video } from '@/types';
import VideoCard from './VideoCard';
import { useTranslation } from 'react-i18next';

interface VideoListProps {
 videos: Video[];
 viewType?: 'table' | 'grid';
 loading?: boolean;
}

export default function VideoList({ 
 videos, 
 viewType = 'grid',
 loading
}: VideoListProps) {
 const { t } = useTranslation();
 const [sortConfig, setSortConfig] = useState<{
   key: keyof Video;
   direction: 'asc' | 'desc';
 } | null>(null);

 const sortedVideos = React.useMemo(() => {
   if (!sortConfig) return videos;

   return [...videos].sort((a, b) => {
     const aValue = a[sortConfig.key];
     const bValue = b[sortConfig.key];
     
     if (!aValue || !bValue) return 0;
     
     if (aValue < bValue) {
       return sortConfig.direction === 'asc' ? -1 : 1;
     }
     if (aValue > bValue) {
       return sortConfig.direction === 'asc' ? 1 : -1;
     }
     return 0;
   });
 }, [videos, sortConfig]);

 const requestSort = (key: keyof Video) => {
   let direction: 'asc' | 'desc' = 'asc';
   if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
     direction = 'desc';
   }
   setSortConfig({ key, direction });
 };

 if (loading) {
   return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
       {[...Array(6)].map((_, i) => (
         <div key={i} className="animate-pulse">
           <div className="bg-gray-200 aspect-video rounded-lg mb-2"></div>
           <div className="space-y-2">
             <div className="h-4 bg-gray-200 rounded w-3/4"></div>
             <div className="h-4 bg-gray-200 rounded w-1/2"></div>
           </div>
         </div>
       ))}
     </div>
   );
 }

 if (!videos?.length) {
   return <div className="text-center text-gray-500">動画が見つかりませんでした</div>;
 }

 if (viewType === 'grid') {
   return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
       {sortedVideos.map((video) => (
         <VideoCard
           key={video.id}
           videoId={video.youtube_id || video.id}
           title={video.title}
           thumbnail={video.thumbnail}
           channelTitle={video.channelTitle}
           viewCount={video.viewCount}
           rating={video.rating}
           video={video}
         />
       ))}
     </div>
   );
 }

 return (
   <div className="w-full overflow-x-auto">
     <Table>
       <thead>
         <tr className="bg-gray-100">
           <th className="cursor-pointer p-2" onClick={() => requestSort('title')}>
             {t('title')}
             {sortConfig?.key === 'title' && (
               <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
             )}
           </th>
           <th className="cursor-pointer p-2" onClick={() => requestSort('channelTitle')}>
             {t('channel')}
             {sortConfig?.key === 'channelTitle' && (
               <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
             )}
           </th>
           <th className="cursor-pointer p-2" onClick={() => requestSort('publishedAt')}>
             {t('publishDate')}
             {sortConfig?.key === 'publishedAt' && (
               <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
             )}
           </th>
           <th className="cursor-pointer p-2" onClick={() => requestSort('viewCount')}>
             {t('views')}
             {sortConfig?.key === 'viewCount' && (
               <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
             )}
           </th>
           <th className="cursor-pointer p-2" onClick={() => requestSort('duration')}>
             {t('duration')}
             {sortConfig?.key === 'duration' && (
               <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
             )}
           </th>
         </tr>
       </thead>
       <tbody>
         {sortedVideos.map((video) => (
           <tr key={video.id} className="hover:bg-gray-50">
             <td className="p-2">
               <div className="flex items-center space-x-2">
                 <img
                   src={video.thumbnail}
                   alt={video.title}
                   className="w-24 h-auto"
                 />
                 <span>{video.title}</span>
               </div>
             </td>
             <td className="p-2">{video.channelTitle}</td>
             <td className="p-2">{new Date(video.publishedAt).toLocaleDateString()}</td>
             <td className="p-2">{video.viewCount.toLocaleString()}</td>
             <td className="p-2">{video.duration}</td>
           </tr>
         ))}
       </tbody>
     </Table>
   </div>
 );
}