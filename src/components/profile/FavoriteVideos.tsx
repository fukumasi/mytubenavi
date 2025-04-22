import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Eye, Clock } from 'lucide-react';
import ProfileLayout from './ProfileLayout';
import { supabase } from '@/lib/supabase';
import type { Video } from '@/types';

interface FavoriteVideoCardProps {
    video: Video;
}

function FavoriteVideoCard({ video }: FavoriteVideoCardProps) {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/video/${video.youtube_id}`)}
            className="bg-white dark:bg-dark-surface rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
            <div className="flex p-4">
                <div className="relative flex-shrink-0 w-48">
                    <img
                        src={video.thumbnail || '/placeholder.jpg'}
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-2 line-clamp-2">
                        {video.title}
                    </h3>

                    <div className="flex items-center text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
                        <span className="font-medium">{video.channel_title}</span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-dark-text-secondary">
                        <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            <span>{video.view_count ? `${(video.view_count / 10000).toFixed(1)}万回視聴` : '再生回数不明'}</span>
                        </div>
                        {video.rating && (
                            <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                                <span>{video.rating.toFixed(1)}</span>
                            </div>
                        )}
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{video.published_at ? new Date(video.published_at).toLocaleDateString('ja-JP') : '日付不明'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface FavoriteVideosContentProps {
    videos: Video[];
    loading: boolean;
    error: string | null;
}

function FavoriteVideosContent({ videos, loading, error }: FavoriteVideosContentProps) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-blue-400"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 text-indigo-600 hover:text-indigo-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    再読み込み
                </button>
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600 dark:text-dark-text-secondary">お気に入りの動画はまだありません。</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 text-indigo-600 hover:text-indigo-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    動画を探す
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {videos.map((video) => (
                <FavoriteVideoCard key={video.youtube_id || video.id} video={video} />
            ))}
        </div>
    );
}

export default function FavoriteVideos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                setLoading(true);
                setError(null);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('認証されていません');

                // お気に入り動画の情報を取得
                const { data: favoritesData, error: favoritesError } = await supabase
                    .from('favorites')
                    .select(`
                        *,
                        videos!inner (
                          id,
                          youtube_id,
                          title,
                          description,
                          thumbnail,
                          channel_title,
                          published_at,
                          view_count,
                          rating,
                          duration,
                          review_count
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (favoritesError) throw favoritesError;

                // videosの中身を抽出して、Videoの配列に変換
                const validVideos = favoritesData
                    .filter(item => item.videos)
                    .map(item => ({
                        ...item.videos,
                        favorited_at: item.created_at
                    }));

                setVideos(validVideos);
            } catch (err) {
                console.error('お気に入り動画の取得に失敗:', err);
                setError('お気に入り動画の読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, []);

    return (
        <ProfileLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">お気に入り動画</h2>
                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                        {!loading && !error && `${videos.length}件の動画`}
                    </span>
                </div>
                <FavoriteVideosContent videos={videos} loading={loading} error={error} />
            </div>
        </ProfileLayout>
    );
}