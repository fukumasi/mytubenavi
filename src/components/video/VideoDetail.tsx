import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, getUserVideoRating, getAllVideoRatings } from '@/lib/supabase';
import type { Video, AggregatedVideoRating, VideoRating } from '@/types';
import VideoPlayer from './VideoPlayer';
import FavoriteButton from '../video/FavoriteButton';
import VideoRatingDisplay from './VideoRatingDisplay';
import VideoRatingForm from './VideoRatingForm';

const defaultRatings: AggregatedVideoRating = {
    reliability: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    entertainment: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    usefulness: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    quality: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    originality: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    clarity: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    overall: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
};

export default function VideoDetail() {
    const { videoId } = useParams();
    const [video, setVideo] = useState<Video | null>(null);
    const [userRating, setUserRating] = useState<VideoRating | null>(null);
    const [allRatings, setAllRatings] = useState<VideoRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const fetchVideoData = useCallback(async () => {
        if (!videoId) return null;

        const { data: videoData, error: videoError } = await supabase
            .from('videos')
            .select('*')
            .eq('youtube_id', videoId)
            .single();

        if (videoError) throw videoError;
        if (!videoData) throw new Error('Video not found');

        return {
            ...videoData,
            title: videoData.title,
            description: videoData.description || '',
            thumbnail: videoData.thumbnail,
            duration: videoData.duration || '',
            viewCount: videoData.view_count,
            publishedAt: videoData.published_at,
            channelTitle: videoData.channel_title,
            youtube_id: videoData.youtube_id,
            genre_id: videoData.genre_id,
            avg_rating: videoData.avg_rating || 0,
            review_count: videoData.review_count || 0,
            mytubenavi_comment_count: videoData.mytubenavi_comment_count || 0,
            rating: videoData.rating || 0,
            ratings: videoData.ratings || defaultRatings,
            channelId: videoData.youtuber?.channel_id || '',
        } as Video;
    }, [videoId]);

    const refreshData = useCallback(async () => {
        if (!videoId) return;

        try {
            setLoading(true);
            const [videoData, userRatingData, allRatingsData] = await Promise.all([
                fetchVideoData(),
                getUserVideoRating(videoId),
                getAllVideoRatings(videoId)
            ]);

            if (videoData) {
                videoData.ratings = videoData.ratings || defaultRatings;
                setVideo(videoData);
            }
            setUserRating(userRatingData);
            setAllRatings(allRatingsData || []);

        } catch (err) {
            console.error('Error fetching video details:', err);
            setError('動画の読み込みに失敗しました。');
        } finally {
            setLoading(false);
        }
    }, [videoId, fetchVideoData]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    useEffect(() => {
        if (!videoId) return;

        const subscription = supabase
            .channel('video_rating_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'videos',
                    filter: `youtube_id=eq.${videoId}`
                },
                async (payload) => {
                    console.log('Video data updated:', payload);
                    await refreshData();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [videoId, refreshData]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="container mx-auto p-4 text-center">
                <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-600">{error || '動画が見つかりませんでした。'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            {/* 動画プレイヤーセクション */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="max-w-4xl mx-auto relative pt-[56.25%]">
                    <div className="absolute top-0 left-0 w-full h-full">
                        <VideoPlayer
                            videoId={video.youtube_id}
                            width="100%"
                            height="100%"
                        />
                    </div>
                </div>

                {/* 動画情報ヘッダー */}
                <div className="p-6">
                    <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
                    
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 text-gray-600">
                            <span>{video.viewCount?.toLocaleString() || 0} 回視聴</span>
                            <span>投稿日: {new Date(video.publishedAt).toLocaleDateString()}</span>
                            <FavoriteButton videoId={video.youtube_id} />
                        </div>
                    </div>

                    {/* チャンネル情報とジャンル */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <img
                                src={`https://www.youtube.com/channel/${video.channelId}/picture`}
                                alt={video.channelTitle}
                                className="w-12 h-12 rounded-full"
                            />
                            <div>
                                <h2 className="font-medium">{video.channelTitle}</h2>
                                <span className="text-sm text-gray-600">{video.genre_id}</span>
                            </div>
                        </div>
                    </div>

                    {/* 動画説明 */}
                    <div className="mt-4">
                        <div>
                            <p className={`text-gray-700 whitespace-pre-wrap ${
                                !isDescriptionExpanded ? 'line-clamp-2' : ''
                            }`}>
                                {isDescriptionExpanded ? video.description : video.description.slice(0, 150) + '...'}
                            </p>
                            {video.description.length > 150 && (
                                <button
                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    className="text-indigo-600 hover:text-indigo-800 mt-2 text-sm font-medium"
                                >
                                    {isDescriptionExpanded ? '閉じる' : '続きを見る'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 評価セクション */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左カラム: 評価サマリー */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-6">総合評価</h2>
                    {video.ratings && (
                        <VideoRatingDisplay
                            ratings={video.ratings}
                            showDetails
                            userRatings={userRating ? [userRating] : []}
                            allRatings={allRatings}
                        />
                    )}
                </div>

                {/* 右カラム: 評価フォーム */}
<div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-xl font-bold mb-6">評価を投稿</h2>
    <VideoRatingForm
        videoId={videoId!}
        onSubmit={async () => {
            await refreshData();
            setUserRating(null);
        }}
        initialRatings={undefined}
    />
</div>
            </div>
        </div>
    );
}