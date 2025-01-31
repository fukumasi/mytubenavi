import { useNavigate } from 'react-router-dom';
import type { Video } from '../../types';

interface NewVideosProps {
 videos: Video[];
}

export default function NewVideos({ videos }: NewVideosProps) {
 const navigate = useNavigate();

 return (
   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
     {videos.map((video) => (
       <div
         key={video.id}
         onClick={() => navigate(`/video/${video.id}`)}
         className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
       >
         <div className="aspect-video relative">
           <img
             src={video.thumbnail}
             alt={video.title}
             className="w-full h-full object-cover rounded-t-lg"
           />
           <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
             {video.duration}
           </div>
         </div>
         <div className="p-3">
           <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
             {video.title}
           </h3>
           <p className="text-xs text-gray-600 mb-1">{video.channelTitle}</p>
           <div className="flex items-center text-xs text-gray-500">
             <span>{(video.viewCount / 10000).toFixed(1)}万回視聴</span>
             {video.rating && (
               <>
                 <span className="mx-2">•</span>
                 <span>★{video.rating.toFixed(1)}</span>
               </>
             )}
           </div>
         </div>
       </div>
     ))}
   </div>
 );
}