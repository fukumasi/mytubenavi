import { createClient } from '@supabase/supabase-js';
import { YouTubeAPI, extractVideoId } from './youtube';
import type {
    Video,
    Review,
    Genre,
    Profile,
    SearchResult,
    Event,
    EventParticipant,
} from '../types';

// チャンネル統計の型定義
export interface ChannelStats {
    totalViews: number;
    totalSubscribers: number;
    averageRating: number;
    totalVideos: number;
    publishedVideos: number;
    draftVideos: number;
    viewsGrowth: number;
    subscribersGrowth: number;
    viewsData: { date: string; views: number }[];
    subscribersData: { date: string; subscribers: number }[];
}

// ratingsの型定義
export type Ratings = {
    reliability: { averageRating: number; totalRatings: number; distribution: { [key: string]: number } };
    entertainment: { averageRating: number; totalRatings: number; distribution: { [key: string]: number } };
    usefulness: { averageRating: number; totalRatings: number; distribution: { [key: string]: number } };
    quality: { averageRating: number; totalRatings: number; distribution: { [key: string]: number } };
    originality: { averageRating: number; totalRatings: number; distribution: { [key: string]: number } };
    clarity: { averageRating: number; totalRatings: number; distribution: { [key: string]: number } };
    overall: { averageRating: number; totalRatings: number; distribution: { [key: string]: number } };
};

// Supabase初期化
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// 型定義を更新
export interface VideoReviewCountResponse { // export追加
    id: string;
    title: string;
    youtube_id: string;
    review_count: number;
}

// 型定義を追加
interface SupabaseVideoResponse {
    id: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: string;
    view_count?: number;
    rating?: number | string;
    genre_id?: string;
    published_at?: string;
    channel_title?: string;
    youtuber?: any;
    youtube_id?: string;
    review_count?: number;
    avg_rating?: number;
    created_at?: string;
    updated_at?: string;
}

// SupabaseVideo型からVideo型への変換
const mapSupabaseVideoToVideo = (video: SupabaseVideoResponse | VideoReviewCountResponse): Video => { // 型を追加
    const isSupabaseVideoResponse = (video: SupabaseVideoResponse | VideoReviewCountResponse): video is SupabaseVideoResponse => {
        return 'description' in video; // descriptionプロパティの有無で型を判別
    };

    const base: Video = {
        id: video.id,
        title: video.title || '',
        description: isSupabaseVideoResponse(video) ? video.description || '' : '',
        thumbnail: isSupabaseVideoResponse(video) ? video.thumbnail || '' : '',
        duration: isSupabaseVideoResponse(video) ? video.duration || '' : '',
        view_count: isSupabaseVideoResponse(video) ? video.view_count || 0 : 0,
        rating: isSupabaseVideoResponse(video) ? (typeof video.rating === 'string' ? parseFloat(video.rating) : video.rating || 0) : 0,
        genre_id: isSupabaseVideoResponse(video) ? video.genre_id : undefined,
        published_at: isSupabaseVideoResponse(video) ? video.published_at || '' : '',
        channel_title: isSupabaseVideoResponse(video) ? video.channel_title || '' : '',
        youtuber: isSupabaseVideoResponse(video) ? video.youtuber : undefined,
        youtube_id: video.youtube_id || '',
        review_count: video.review_count || 0,
        avg_rating: isSupabaseVideoResponse(video) ? video.avg_rating || 0 : 0,
        created_at: isSupabaseVideoResponse(video) ? video.created_at || new Date().toISOString() : new Date().toISOString(),
        updated_at: isSupabaseVideoResponse(video) ? video.updated_at || new Date().toISOString() : new Date().toISOString(),
    };
    return base;
};


// 最近の動画取得
export const getRecentVideos = async (limit: number = 30): Promise<Video[]> => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('published_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(video => mapSupabaseVideoToVideo(video as SupabaseVideoResponse));
    } catch (err) {
        console.error('Error fetching recent videos:', err);
        return [];
    }
};

// 人気動画取得
export const getPopularVideos = async (limit: number = 10): Promise<Video[]> => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('view_count', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(video => mapSupabaseVideoToVideo(video as SupabaseVideoResponse));
    } catch (err) {
        console.error('Error fetching popular videos:', err);
        return [];
    }
};

// 人気動画取得（評価順）- 修正版
export const getPopularVideosByRating = async (limit: number = 10): Promise<Video[]> => {
    try {
        console.log('Fetching popular videos by rating, limit:', limit);

        // 1. すべての動画を取得
        const { data: videos, error: videosError } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30); // より多くの候補を取得

        if (videosError) throw videosError;

        if (!videos || videos.length === 0) return [];

        // 2. レビューデータを取得
        const { data: reviewData, error: reviewError } = await supabase
    .from('video_ratings')  // ここを変更
    .select('*');

        if (reviewError) throw reviewError;

        // 3. 各動画のレビュー数をカウント
        const videoReviewCounts: Record<string, number> = {};
        const videoRatings: Record<string, number[]> = {};

        if (reviewData && reviewData.length > 0) {
            reviewData.forEach(review => {
                // レビュー数をカウント
                if (!videoReviewCounts[review.video_id]) {
                    videoReviewCounts[review.video_id] = 0;
                    videoRatings[review.video_id] = [];
                }
                videoReviewCounts[review.video_id]++;

                // 評価を記録
                if (review.rating) {
                    videoRatings[review.video_id].push(review.rating);
                }
            });
        }

        // 4. 動画データに評価情報を追加
        const videosWithReviews = videos.map(video => {
            const reviewCount = videoReviewCounts[video.id] || 0;
            const ratings = videoRatings[video.id] || [];
            const avgRating = ratings.length > 0
                ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
                : 0;

            return {
                ...video,
                review_count: reviewCount,
                avg_rating: avgRating
            };
        });

        // 5. レビュー数とレーティングでソート（条件を緩和：レビュー数0も含める）
        const sortedVideos = videosWithReviews
            .sort((a, b) => {
                // まずレビュー数でソート
                const reviewDiff = (b.review_count || 0) - (a.review_count || 0);
                if (reviewDiff !== 0) return reviewDiff;

                // レビュー数が同じなら評価でソート
                return (b.avg_rating || 0) - (a.avg_rating || 0);
            })
            .slice(0, limit);

        console.log('Filtered popular videos:', sortedVideos);

        return sortedVideos.map(video => mapSupabaseVideoToVideo(video as SupabaseVideoResponse));
    } catch (err) {
        console.error('Error fetching popular videos by rating:', err);
        return [];
    }
};


// 接続チェック用の関数
export const checkSupabaseConnection = async (): Promise<{ connected: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('profiles').select('count').limit(1);
        if (error) {
            if (error.code === '42P01') {
                return {
                    connected: false,
                    error: 'データベーステーブルが見つかりません。マイグレーションを実行してください。'
                };
            }
            return {
                connected: false,
                error: `データベース接続エラー: ${error.message}`
            };
        }
        return { connected: true };
    } catch (err) {
        return {
            connected: false,
            error: 'Supabaseサービスに接続できません。'
        };
    }
};

// ジャンル関連の関数
export const getMainGenres = async (): Promise<Genre[]> => {
    try {
        const { data, error } = await supabase
            .from('genres')
            .select('*')
            .is('parent_genre_id', null)  // 大ジャンルのみを取得
            .order('order', { ascending: true });  // 順序通りに表示

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching main genres:', err);
        return [];
    }
};

export const getSubGenres = async (slug: string): Promise<Genre[]> => {
    try {
        const { data: parent } = await supabase
            .from('genres')
            .select('id')
            .eq('slug', slug.toLowerCase())
            .single();

        if (!parent) return [];

        const { data, error } = await supabase
            .from('genres')
            .select('*')
            .eq('parent_genre_id', parent.id)
            .order('order');

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching sub genres:', err);
        return [];
    }
};

export const getGenreInfo = async (slug: string): Promise<Genre | null> => {
    try {
        const { data, error } = await supabase
            .from('genres')
            .select('*')
            .eq('slug', slug.toLowerCase())
            .single();

        if (error) return null;
        return data;
    } catch (err) {
        console.error('Error fetching genre info:', err);
        return null;
    }
};

// プロフィール関連の関数
export const getProfile = async (): Promise<Profile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data as Profile;
};

export const updateProfile = async (profile: Partial<Profile>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', user.id);

    if (error) throw error;
};

export const uploadAvatar = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

    return data.publicUrl;
};

// YouTube URLから動画情報を取得してDBに保存
export const addVideoToDatabase = async (videoUrl: string): Promise<void> => {
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Invalid YouTube URL format');
        }

        const videoDetails = await YouTubeAPI.getVideoDetails(videoId);
        if (!videoDetails || videoDetails.length === 0) {
            throw new Error('動画情報の取得に失敗しました');
        }

        const details = videoDetails[0];
        const { error } = await supabase.from('videos').upsert({
            id: details.id,
            title: details.snippet?.title || '',
            description: details.snippet?.description || '',
            thumbnail: details.snippet?.thumbnails?.medium?.url || '',
            duration: details.contentDetails?.duration || '',
            view_count: parseInt(details.statistics?.viewCount || '0'),
            rating: details.statistics?.likeCount
                ? (parseInt(details.statistics.likeCount) / parseInt(details.statistics.viewCount || '1')) * 5
                : null,
            published_at: details.snippet?.publishedAt || new Date().toISOString(),
            channel_title: details.snippet?.channelTitle || '',
            youtuber: {
                channelName: details.snippet?.channelTitle || '',
                channelUrl: `https://www.youtube.com/channel/${details.snippet?.channelId || ''}`,
                verificationStatus: 'pending' as const, // 'unknown'から'pending'に変更
                channel_id: details.snippet?.channelId,
                avatar_url: undefined,
                subscribers: undefined
            },
            youtube_id: details.id,
            genre_id: null
        });

        if (error) {
            console.error('Error saving video to Supabase:', error);
            throw error;
        }
    } catch (err) {
        console.error('Error processing video URL:', err);
        throw err;
    }
};

// お気に入り関連の関数
export const getFavoriteVideos = async (): Promise<Video[]> => {
    const { data, error } = await supabase
        .from('favorites')
        .select(`
     video_id,
     videos:video_id (*)
   `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || [])
        .map(item => {
            if (item.videos && typeof item.videos === 'object' && !Array.isArray(item.videos)) {
                return mapSupabaseVideoToVideo(item.videos as SupabaseVideoResponse);
            }
            return null;
        })
        .filter((video): video is Video => video !== null);
};

export const getFavoriteStatus = async (videoId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();  // single()の代わりにmaybeSingle()を使用

    if (error) {
        console.error('Error checking favorite status:', error);
        return false;
    }

    return !!data;
};

export const toggleFavorite = async (videoId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('video_id', videoId);

        if (error) throw error;
        return false;
    } else {
        const { error } = await supabase
            .from('favorites')
            .insert([{
                user_id: user.id,
                video_id: videoId
            }]);

        if (error) throw error;
        return true;
    }
};

// レビュー関連の関数
export const getVideoReviews = async (videoId: string): Promise<Review[]> => {
    console.warn('video_reviews テーブルは削除されました。代わりにvideo_ratingsテーブルを使用してください。');
    return getAllVideoRatings(videoId) as any; // 型アサーションを追加
};


// ビデオ評価を取得する関数
export const getVideoRating = async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .rpc('get_video_rating', { p_video_id: videoId });

    if (error) {
        console.error('Error fetching video rating:', error);
        throw error;
    }

    return data;
};

// レビュー投稿
export const postReview = async (
    videoId: string,
    rating: number,
    comment: string
) => {
    // video_ratings テーブルに評価を投稿するように変更
    return submitVideoRating(
        videoId,
        rating,  // overall
        rating,  // clarity
        rating,  // entertainment
        rating,  // originality
        rating,  // quality
        rating,  // reliability
        rating,  // usefulness
        comment
    );
};

// レビュー更新
export const updateReview = async (
    _reviewId: string,
    _rating: number,
    _comment: string
) => {
    console.warn('updateReview関数は廃止されました。代わりにsubmitVideoRating関数を使用してください。');

    // reviewIdの代わりにvideoIdが必要なため、エラーを投げる
    throw new Error('この関数は使用できません。submitVideoRating関数を使用してください。');
};

// レビュー削除
export const deleteReview = async (_reviewId: string) => {
    console.warn('deleteReview関数は廃止されました。');

    // 削除機能が必要な場合は新しい実装を検討
    throw new Error('レビュー削除機能は現在利用できません。');
};

export const getUserReviews = async (): Promise<Review[]> => {
    console.warn('getUserReviews関数は削除されました。');

    // 代替の実装が必要な場合は、video_ratingsテーブルから取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('video_ratings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user reviews:', error);
        return [];
    }

    return (data || []) as any; // 型アサーションを追加
};


// 検索関連の関数
export const searchVideos = async (
    query: string,
): Promise<SearchResult> => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .ilike('title', `%${query}%`)
            .order('published_at', { ascending: false });

        if (error) {
            console.error('Search error:', error);
            return { videos: [], totalPages: 0 };
        }

        const videos = (data || []).map(video => mapSupabaseVideoToVideo(video as SupabaseVideoResponse));

        return {
            videos,
            totalPages: Math.ceil((data?.length || 0) / 10)
        };
    } catch (error) {
        console.error('Search error:', error);
        return { videos: [], totalPages: 0 };
    }
};

// イベント関連の関数
export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> => {
    const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getEvent = async (eventId: string): Promise<Event | null> => {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (error) throw error;
    return data;
};

export const updateEvent = async (eventId: string, updates: Partial<Event>): Promise<Event> => {
    const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getEventParticipants = async (eventId: string): Promise<EventParticipant[]> => {
    const { data, error } = await supabase
        .from('event_participants')
        .select(`
     *,
     profiles (username, avatar_url)
   `)
        .eq('event_id', eventId);

    if (error) throw error;
    return data;
};

export const participateInEvent = async (eventId: string): Promise<void> => {
    const { error } = await supabase
        .from('event_participants')
        .insert([{ event_id: eventId }]);

    if (error) throw error;
};

// チャンネル統計を取得する関数
export const getChannelStats = async (userId?: string | null): Promise<ChannelStats> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return {
                totalViews: 0,
                totalSubscribers: 0,
                averageRating: 0,
                totalVideos: 0,
                publishedVideos: 0,
                draftVideos: 0,
                viewsGrowth: 0,
                subscribersGrowth: 0,
                viewsData: [],
                subscribersData: []
            };
        }

        // userIdパラメータを使用して特定のユーザーの統計を取得
        const targetUserId = userId || user.id;

        // 動画統計の取得
        const { data: videoStats } = await supabase
            .from('videos')
            .select('view_count, published_at')
            .eq('user_id', targetUserId);

        return {
            totalViews: videoStats?.reduce((sum, video) => sum + (video.view_count || 0), 0) || 0,
            totalSubscribers: 0,
            averageRating: 0,
            totalVideos: videoStats?.length || 0,
            publishedVideos: videoStats?.filter(v => v.published_at).length || 0,
            draftVideos: videoStats?.filter(v => !v.published_at).length || 0,
            viewsGrowth: 0,
            subscribersGrowth: 0,
            viewsData: [],
            subscribersData: []
        };
    } catch (error) {
        console.error('チャンネル統計の取得に失敗:', error);
        return {
            totalViews: 0,
            totalSubscribers: 0,
            averageRating: 0,
            totalVideos: 0,
            publishedVideos: 0,
            draftVideos: 0,
            viewsGrowth: 0,
            subscribersGrowth: 0,
            viewsData: [],
            subscribersData: []
        };
    }
};
export const publishVideo = async (videoId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('videos')
            .update({ published_at: new Date().toISOString() })
            .eq('id', videoId);

        if (error) throw error;
    } catch (err) {
        console.error('動画の公開に失敗:', err);
        throw err;
    }
};

export const deleteVideo = async (videoId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('videos')
            .delete()
            .eq('id', videoId);

        if (error) throw error;
    } catch (err) {
        console.error('動画の削除に失敗:', err);
        throw err;
    }
};

// 認証状態の確認
export const checkAuth = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        console.log('Current User:', user);
        console.log('Authentication Error:', error);

        if (error) {
            console.error('認証エラー:', error.message);
            return null;
        }

        return user;
    } catch (error) {
        console.error('認証チェックエラー:', error);
        return null;
    }
};
// 視聴履歴の追加 (userId を引数に取るバージョン)
export const addViewHistory = async (videoId: string, userId: string) => {
    try {
        const { error } = await supabase
            .from('view_history')
            .upsert({
                user_id: userId,
                video_id: videoId,
                viewed_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,video_id'
            });

        if (error) throw error;
    } catch (error) {
        console.error('視聴履歴の追加に失敗:', error);
        throw error;
    }
};

// 視聴履歴の取得 (userId を引数に取るバージョン)
export const getViewHistory = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('view_history')
            .select(`
               *,
               videos (
                   id,
                   title,
                   thumbnail,
                   channel_title,
                   view_count,
                   rating,
                   duration
               )
           `)
            .eq('user_id', userId)
            .order('viewed_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('視聴履歴の取得に失敗:', error);
        return [];
    }
};


// 7項目評価データの保存送信
export const submitVideoRating = async (
    videoId: string,
    overall: number,
    clarity: number,
    entertainment: number,
    originality: number,
    quality: number,
    reliability: number,
    usefulness: number,
    comment: string
) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // UUIDからYouTube IDに変換
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
    let youtube_id = videoId;
    
    if (isUuid) {
        const { data: videoData, error: videoError } = await supabase
            .from('videos')
            .select('youtube_id')
            .eq('id', videoId)
            .single();
            
        if (videoError) {
            console.error('Error getting YouTube ID from UUID:', videoError);
            throw videoError;
        }
        
        if (!videoData || !videoData.youtube_id) {
            console.error('No YouTube ID found for UUID:', videoId);
            throw new Error('No YouTube ID found for this video');
        }
        
        youtube_id = videoData.youtube_id;
    }

    // YouTube IDを使用して評価を保存
    const { data, error } = await supabase
        .from('video_ratings')
        .upsert([{
            video_id: youtube_id,
            user_id: user.id,
            overall,
            clarity,
            entertainment,
            originality,
            quality,
            reliability,
            usefulness,
            comment
        }], {
            onConflict: 'user_id,video_id'
        })
        .select()
        .single();

    if (error) {
        console.error('評価送信エラー:', error);
        throw error;
    }

    return data;
};

// getAllVideoRatings 関数の修正
export const getAllVideoRatings = async (videoId: string) => {
    try {
        // UUIDか判断
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
        
        let youtube_id = videoId;
        
        // UUIDの場合はYouTube IDを取得
        if (isUuid) {
            const { data: videoData, error: videoError } = await supabase
                .from('videos')
                .select('youtube_id')
                .eq('id', videoId)
                .single();
                
            if (videoError) {
                console.error('Error getting YouTube ID from UUID:', videoError);
                return [];
            }
            
            if (!videoData || !videoData.youtube_id) {
                console.error('No YouTube ID found for UUID:', videoId);
                return [];
            }
            
            youtube_id = videoData.youtube_id;
        }
        
        // YouTube IDで評価データを取得
        const { data: ratingsData, error: ratingsError } = await supabase
            .from('video_ratings')
            .select(`
                *,
                profiles:user_id (
                    id,
                    username,
                    avatar_url
                )
            `)
            .eq('video_id', youtube_id)
            .order('created_at', { ascending: false });
            
        if (ratingsError) {
            console.error('Error fetching video ratings:', ratingsError);
            return [];
        }
        
        console.log(`Found ${ratingsData?.length || 0} ratings for video ${youtube_id}`);
        return (ratingsData || []);
        
    } catch (error) {
        console.error('Error in getAllVideoRatings:', error);
        return [];
    }
};


// getUserVideoRating 関数も同様に修正（既存の実装を置き換える）
export const getUserVideoRating = async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
        // UUIDか判断
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
        
        let youtube_id = videoId;
        
        // UUIDの場合はYouTube IDを取得
        if (isUuid) {
            const { data: videoData, error: videoError } = await supabase
                .from('videos')
                .select('youtube_id')
                .eq('id', videoId)
                .single();
                
            if (videoError) {
                console.error('Error getting YouTube ID from UUID:', videoError);
                return null;
            }
            
            if (!videoData || !videoData.youtube_id) {
                console.error('No YouTube ID found for UUID:', videoId);
                return null;
            }
            
            youtube_id = videoData.youtube_id;
        }

// getUserVideoRating関数の問題部分
const { data: ratingData, error: ratingError } = await supabase
    .from('video_ratings')
    .select(`
        *,
        profiles:user_id (
            id,
            username,
            avatar_url
        )
    `)
    .eq('video_id', youtube_id)  // ここでYouTube IDを使用している
    .eq('user_id', user.id)
    .maybeSingle();

        if (ratingError) {
            console.error('Error fetching user video rating:', ratingError);
            return null;
        }

        return ratingData;

    } catch (error) {
        console.error('Error in getUserVideoRating:', error);
        return null;
    }
};



export const updateVideoReviewCount = async (videoId: string): Promise<number> => {
    try {
        // IDの形式判断
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
        
        let uuid_id = videoId;
        let youtube_id = videoId;
        
        if (isUuid) {
            // UUIDからYouTube IDを取得
            const { data: videoData, error: videoError } = await supabase
                .from('videos')
                .select('youtube_id')
                .eq('id', videoId)
                .single();

            if (videoError) {
                console.error('Error getting YouTube ID from UUID:', videoError);
                throw videoError;
            }
            
            if (videoData && videoData.youtube_id) {
                youtube_id = videoData.youtube_id;
            }
        } else {
            // YouTube IDからUUIDを取得
            const { data: videoData, error: videoError } = await supabase
                .from('videos')
                .select('id')
                .eq('youtube_id', videoId)
                .single();

            if (videoError) {
                console.error('Error getting UUID from YouTube ID:', videoError);
                throw videoError;
            }
            
            if (videoData) {
                uuid_id = videoData.id;
            }
        }

        // レビュー数を集計（YouTube IDを使用）
        const { count, error: reviewError } = await supabase
            .from('video_ratings')
            .select('*', { count: 'exact' })
            .eq('video_id', youtube_id);

        if (reviewError) {
            console.error('Error getting review count:', reviewError);
            throw reviewError;
        }

        // レビュー数をUUIDで更新
        const { error: updateError } = await supabase
            .from('videos')
            .update({ review_count: count })
            .eq('id', uuid_id);

        if (updateError) {
            console.error('Error updating video review count:', updateError);
            throw updateError;
        }

        return count || 0;
    } catch (err) {
        console.error('レビュー数の更新に失敗:', err);
        throw err;
    }
};

export const getVideosByReviewCount = async (limit = 10, minReviews = 1): Promise<Video[]> => {
    try {
      console.log('Fetching videos by review count...');
  
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, youtube_id, review_count, thumbnail, channel_title, avg_rating, duration, genre_id')
        .gt('review_count', minReviews - 1) // レビュー数が1以上（デフォルト）の動画のみ取得
        .order('review_count', { ascending: false })
        .limit(limit);
  
      if (error) {
        console.error('Error fetching videos by review count:', error);
        return [];
      }
  
      return (data || []).map(videoData => ({
        id: videoData.id,
        title: videoData.title || '',
        youtube_id: videoData.youtube_id || '',
        review_count: videoData.review_count || 0,
        thumbnail: videoData.thumbnail || `https://i.ytimg.com/vi/${videoData.youtube_id}/hqdefault.jpg`,
        channel_title: videoData.channel_title || '',
        avg_rating: videoData.avg_rating || 0,
        rating: videoData.avg_rating || 0,
        description: '',
        view_count: 0,
        published_at: '',
        genre_id: videoData.genre_id || '',
        duration: videoData.duration || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        youtuber: undefined
      } as Video));
    } catch (error) {
      console.error('Error fetching videos by review count:', error);
      return [];
    }
  };