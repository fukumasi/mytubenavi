import React, { useEffect, useState } from 'react';
import { Video } from '@/types';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

const PopularVideos: React.FC = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPopularVideos = async () => {
            try {
                const { data, error } = await supabase
                    .from('videos')
                    .select('*')
                    .order('published_at', { ascending: false }) // published_atでソート
                   .limit(10)


                if (error) throw error;
                console.log("fetchPopularVideos data:", data)

                setVideos(data.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    thumbnail: video.thumbnail,
                    duration: video.duration,
                    viewCount: video.view_count,
                    rating: video.rating,
                    publishedAt: video.published_at,
                    channelTitle: video.channel_title,
                    youtube_id: video.youtube_id,
                    commentCount: video.comment_count || 0,
                    genre_id: video.genre_id
                })));
            } catch (error) {
                console.error('Error fetching popular videos:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPopularVideos();
    }, []);

    const handleVideoClick = (videoId: string | null) => {
         console.log("handleVideoClick", videoId);
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
                                    <span>視聴回数: {video.viewCount}</span>
                                    <span>評価: {video.rating.toFixed(1)}</span>
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