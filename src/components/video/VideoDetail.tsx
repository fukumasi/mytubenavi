import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getVideoReviews, supabase } from '@/lib/supabase';
import ReviewList from '@/components/review/ReviewList';
import type { Video, Review } from '@/types';
import VideoPlayer from './VideoPlayer';
import FavoriteButton from '../video/FavoriteButton';
import ReviewForm from '@/components/video/ReviewForm';

export default function VideoDetail() {
    const { videoId } = useParams();
    const { currentUser } = useAuth();
    const [video, setVideo] = useState<Video | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVideoAndReviews = async () => {
            if (videoId) {
                try {
                    setLoading(true);

                    const { data: videoData, error: videoError } = await supabase
                        .from('videos')
                        .select('*')
                        .eq('youtube_id', videoId)
                        .single();

                    if (videoError) throw videoError;
                    if (!videoData) throw new Error('Video not found');

                    const parsedVideo: Video = {
                        ...videoData,
                        id: videoData.id,
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
                        rating: videoData.rating || 0
                    };

                    setVideo(parsedVideo);

                    const reviewsData = await getVideoReviews(videoId);
                    setReviews(reviewsData);

                } catch (err) {
                    console.error('Error fetching video details:', err);
                    setError('動画の読み込みに失敗しました。');
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchVideoAndReviews();
    }, [videoId]);

    const handleReviewSubmit = async () => {
        if (videoId) {
            const updatedReviews = await getVideoReviews(videoId);
            setReviews(updatedReviews);

            const { data: videoData } = await supabase
                .from('videos')
                .select('*')
                .eq('youtube_id', videoId)
                .single();

            if (videoData) {
                setVideo(prev => prev ? {
                    ...prev,
                    avg_rating: videoData.avg_rating || 0,
                    review_count: videoData.review_count || 0,
                    mytubenavi_comment_count: videoData.mytubenavi_comment_count || 0
                } : null);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
        <div className="container mx-auto p-4">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="w-full relative pt-[56.25%]">
                    <div className="absolute top-0 left-0 w-full h-full">
                        {video?.youtube_id && (
                            <VideoPlayer
                                videoId={video.youtube_id}
                                width="100%"
                                height="100%"
                            />
                        )}
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
                        {video?.youtube_id && (
                            <FavoriteButton videoId={video.youtube_id} />
                        )}
                    </div>
                    <div className="text-gray-600 mb-4">
                        <p>{video.viewCount?.toLocaleString() || 0} 回視聴</p>
                        <p>投稿日: {new Date(video.publishedAt).toLocaleDateString()}</p>
                        <div className="flex items-center space-x-4 mt-2">
                            <p className="flex items-center">
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-1" />
                                {video.avg_rating?.toFixed(1) || '未評価'}
                            </p>
                            <p>{video.review_count || 0} 件のレビュー</p>
                            <p>{video.mytubenavi_comment_count || 0} 件のコメント</p>
                        </div>
                    </div>
                    {video.description && (
                        <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200">
                    <h2 className="text-xl font-semibold mb-6">レビュー</h2>

                    {currentUser && (
                        <ReviewForm
                            videoId={videoId!}
                            onReviewSubmitted={handleReviewSubmit}
                            existingReview={reviews.find(review => review.user_id === currentUser.id)}
                        />
                    )}

                    <div className="mt-8">
                        <ReviewList
                            reviews={reviews}
                            currentUserId={currentUser?.id}
                            videoId={videoId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}