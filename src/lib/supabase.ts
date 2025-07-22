// src/lib/supabase.ts

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

// 型定義を更新
export interface VideoReviewCountResponse {
    id: string;
    title: string;
    youtube_id: string;
    review_count: number;
}

// @ts-ignore
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
});

// SupabaseVideo型からVideo型への変換用の内部インターフェース
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
    tags?: string[];
    ratings?: Ratings | string | null;
}

// SupabaseVideoResponse | VideoReviewCountResponse → Video型 変換ヘルパー
const mapSupabaseVideoToVideo = (video: SupabaseVideoResponse | VideoReviewCountResponse): Video => {
    const isSupabaseResponse = (v: any): v is SupabaseVideoResponse => 'description' in v;
    const base: Video = {
        id: video.id,
        title: isSupabaseResponse(video) ? video.title || '' : '',
        description: isSupabaseResponse(video) ? video.description || '' : '',
        thumbnail: isSupabaseResponse(video) ? video.thumbnail || '' : '',
        duration: isSupabaseResponse(video) ? video.duration || '' : '',
        view_count: isSupabaseResponse(video) ? video.view_count || 0 : 0,
        rating: isSupabaseResponse(video)
            ? (typeof video.rating === 'string' ? parseFloat(video.rating) : video.rating || 0)
            : 0,
        genre_id: isSupabaseResponse(video) ? video.genre_id : undefined,
        published_at: isSupabaseResponse(video) ? video.published_at || '' : '',
        channel_title: isSupabaseResponse(video) ? video.channel_title || '' : '',
        youtuber: isSupabaseResponse(video) ? video.youtuber : undefined,
        youtube_id: isSupabaseResponse(video) ? video.youtube_id || '' : '',
        review_count: (video as any).review_count || 0,
        avg_rating: isSupabaseResponse(video) ? video.avg_rating || 0 : 0,
        created_at: isSupabaseResponse(video)
            ? video.created_at || new Date().toISOString()
            : new Date().toISOString(),
        updated_at: isSupabaseResponse(video)
            ? video.updated_at || new Date().toISOString()
            : new Date().toISOString(),
    };

    // JSONB「ratings」カラムを Video.ratings にマッピング
    if (isSupabaseResponse(video) && video.ratings) {
        let r: any = video.ratings;
        if (typeof r === 'string') {
            try { r = JSON.parse(r); } catch { r = {}; }
        }
        base.ratings = {
            overall: {
                averageRating: r.overall?.averageRating || 0,
                totalRatings: r.overall?.totalRatings || 0,
                distribution: typeof r.overall?.distribution === 'string'
                    ? JSON.parse(r.overall.distribution || '{}')
                    : r.overall?.distribution || {},
            },
            reliability: {
                averageRating: r.reliability?.averageRating || 0,
                totalRatings: r.reliability?.totalRatings || 0,
                distribution: typeof r.reliability?.distribution === 'string'
                    ? JSON.parse(r.reliability.distribution || '{}')
                    : r.reliability?.distribution || {},
            },
            entertainment: {
                averageRating: r.entertainment?.averageRating || 0,
                totalRatings: r.entertainment?.totalRatings || 0,
                distribution: typeof r.entertainment?.distribution === 'string'
                    ? JSON.parse(r.entertainment.distribution || '{}')
                    : r.entertainment?.distribution || {},
            },
            usefulness: {
                averageRating: r.usefulness?.averageRating || 0,
                totalRatings: r.usefulness?.totalRatings || 0,
                distribution: typeof r.usefulness?.distribution === 'string'
                    ? JSON.parse(r.usefulness.distribution || '{}')
                    : r.usefulness?.distribution || {},
            },
            quality: {
                averageRating: r.quality?.averageRating || 0,
                totalRatings: r.quality?.totalRatings || 0,
                distribution: typeof r.quality?.distribution === 'string'
                    ? JSON.parse(r.quality.distribution || '{}')
                    : r.quality?.distribution || {},
            },
            originality: {
                averageRating: r.originality?.averageRating || 0,
                totalRatings: r.originality?.totalRatings || 0,
                distribution: typeof r.originality?.distribution === 'string'
                    ? JSON.parse(r.originality.distribution || '{}')
                    : r.originality?.distribution || {},
            },
            clarity: {
                averageRating: r.clarity?.averageRating || 0,
                totalRatings: r.clarity?.totalRatings || 0,
                distribution: typeof r.clarity?.distribution === 'string'
                    ? JSON.parse(r.clarity.distribution || '{}')
                    : r.clarity?.distribution || {},
            },
        };
    }

    return base;
};

// --- fetch / RPC 実装 ---

// 最近の動画取得
export const getRecentVideos = async (limit: number = 30): Promise<Video[]> => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('published_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(v => mapSupabaseVideoToVideo(v as SupabaseVideoResponse));
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
        return (data || []).map(v => mapSupabaseVideoToVideo(v as SupabaseVideoResponse));
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
            .limit(30);

        if (videosError) throw videosError;
        if (!videos || videos.length === 0) return [];

        // 2. レビューデータを取得
        const { data: reviewData, error: reviewError } = await supabase
            .from('video_ratings')
            .select('*');
        if (reviewError) throw reviewError;

        // 3. 各動画でレビュー数＆評価を集計
        const counts: Record<string, number> = {};
        const ratingsMap: Record<string, number[]> = {};
        reviewData.forEach(r => {
            counts[r.video_id] = (counts[r.video_id] || 0) + 1;
            if (r.rating != null) ratingsMap[r.video_id] = (ratingsMap[r.video_id] || []).concat(r.rating);
        });

        // 4. 平均評価を計算してマージ
        const withStats = videos.map(v => {
            const c = counts[v.id] || 0;
            const arr = ratingsMap[v.id] || [];
            const avg = arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
            return { ...v, review_count: c, avg_rating: avg };
        });

        // 5. ソート＆切り出し
        const sorted = withStats
            .sort((a, b) => (b.review_count || 0) - (a.review_count || 0) || (b.avg_rating || 0) - (a.avg_rating || 0))
            .slice(0, limit);

        return sorted.map(v => mapSupabaseVideoToVideo(v as SupabaseVideoResponse));
    } catch (err) {
        console.error('Error fetching popular videos by rating:', err);
        return [];
    }
};

// 接続チェック用
export const checkSupabaseConnection = async (): Promise<{ connected: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('profiles').select('count').limit(1);
        if (error) {
            if (error.code === '42P01') {
                return {
                    connected: false,
                    error: 'テーブルがありません。マイグレーションを実行してください。'
                };
            }
            return { connected: false, error: `接続エラー: ${error.message}` };
        }
        return { connected: true };
    } catch {
        return { connected: false, error: 'Supabase に接続できません。' };
    }
};

// ジャンル関連
export const getMainGenres = async (): Promise<Genre[]> => {
    try {
        const { data, error } = await supabase
            .from('genres')
            .select('*')
            .is('parent_genre_id', null)
            .order('order', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching main genres:', err);
        return [];
    }
};

export const getSubGenres = async (slug: string): Promise<Genre[]> => {
    try {
        const { data: pd, error: pe } = await supabase
            .from('genres')
            .select('id')
            .eq('slug', slug.toLowerCase())
            .limit(1);
        if (pe || !pd?.length) return [];
        const { data, error } = await supabase
            .from('genres')
            .select('*')
            .eq('parent_genre_id', pd[0].id)
            .order('order');
        if (error) throw error;
        return data || [];
    } catch {
        return [];
    }
};

export const getGenreInfo = async (slug: string): Promise<Genre | null> => {
    try {
        const { data, error } = await supabase
            .from('genres')
            .select('*')
            .eq('slug', slug.toLowerCase())
            .limit(1);
        if (error) return null;
        return data?.[0] || null;
    } catch {
        return null;
    }
};

// プロフィール関連
export const getProfile = async (): Promise<Profile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1);
    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data?.[0] as Profile;
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
    const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(fileName);
    return data.publicUrl;
};

// YouTube URLからDB登録
export const addVideoToDatabase = async (videoUrl: string): Promise<void> => {
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Invalid YouTube URL format');
        }
        const videoDetails = await YouTubeAPI.getVideoDetails(videoId);
        if (!videoDetails?.length) {
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
                verificationStatus: 'pending' as const,
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

// お気に入り関連
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
        .map(item =>
            item.videos && typeof item.videos === 'object' && !Array.isArray(item.videos)
                ? mapSupabaseVideoToVideo(item.videos as SupabaseVideoResponse)
                : null
        )
        .filter((v): v is Video => v !== null);
};

export const getFavoriteStatus = async (videoId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .limit(1);
    if (error) {
        console.error('Error checking favorite status:', error);
        return false;
    }
    return (data || []).length > 0;
};

export const toggleFavorite = async (videoId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: existingData, error: existingError } = await supabase
        .from('favorites')
        .select('id')  
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .limit(1);
    if (existingError) throw existingError;
    const exists = (existingData || []).length > 0;
    if (exists) {
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
            .insert([{ user_id: user.id, video_id: videoId }]);
        if (error) throw error;
        return true;
    }
};
// レビュー関連
export const getVideoReviews = async (videoId: string): Promise<Review[]> => {
    console.warn('video_reviews テーブルは削除されました。代わりに video_ratings テーブルを使用してください。');
    return getAllVideoRatings(videoId) as any;
};

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

export const postReview = async (videoId: string, rating: number, comment: string) => {
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

export const updateReview = async (_reviewId: string, _rating: number, _comment: string) => {
    console.warn('updateReview 関数は廃止されました。submitVideoRating 関数を使用してください。');
    throw new Error('この関数は使用できません。submitVideoRating を使用してください。');
};

export const deleteReview = async (_reviewId: string) => {
    console.warn('deleteReview 関数は廃止されました。');
    throw new Error('レビュー削除機能は現在利用できません。');
};

export const getUserReviews = async (): Promise<Review[]> => {
    console.warn('getUserReviews 関数は廃止されました。');
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
    return data;
};

// 検索関連
export const searchVideos = async (query: string): Promise<SearchResult> => {
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
        const videos = (data || []).map(v => mapSupabaseVideoToVideo(v as SupabaseVideoResponse));
        return { videos, totalPages: Math.ceil((data?.length || 0) / 10) };
    } catch (err) {
        console.error('Search error:', err);
        return { videos: [], totalPages: 0 };
    }
};

// イベント関連
export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> => {
    const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .limit(1);
    if (error) throw error;
    if (!data?.length) throw new Error('Failed to create event');
    return data[0];
};

export const getEvent = async (eventId: string): Promise<Event | null> => {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .limit(1);
    if (error) throw error;
    return data?.[0] || null;
};

export const updateEvent = async (eventId: string, updates: Partial<Event>): Promise<Event> => {
    const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .limit(1);
    if (error) throw error;
    if (!data?.length) throw new Error('Failed to update event');
    return data[0];
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

// チャンネル統計取得
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
        const targetUserId = userId || user.id;
        const { data: videoStats } = await supabase
            .from('videos')
            .select('view_count, published_at')
            .eq('user_id', targetUserId);

        return {
            totalViews: videoStats?.reduce((s, v) => s + (v.view_count || 0), 0) || 0,
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
    } catch (err) {
        console.error('チャンネル統計取得失敗:', err);
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
    const { error } = await supabase
        .from('videos')
        .update({ published_at: new Date().toISOString() })
        .eq('id', videoId);
    if (error) throw error;
};

export const deleteVideo = async (videoId: string): Promise<void> => {
    const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);
    if (error) throw error;
};

// 認証状態確認
export const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('認証チェックエラー:', error);
        return null;
    }
    return user;
};

// 視聴履歴追加
export const addViewHistory = async (videoId: string, userId: string) => {
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
};

// 視聴履歴取得
export const getViewHistory = async (userId: string) => {
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
};

// 7項目評価送信
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
    let youtube_id = videoId;
    if (isUuid) {
        const { data: vd, error: ve } = await supabase
            .from('videos')
            .select('youtube_id')
            .eq('id', videoId)
            .limit(1);
        if (ve || !vd?.length) throw ve || new Error('No YouTube ID');
        youtube_id = vd[0].youtube_id!;
    }
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
        .limit(1);
    if (error) throw error;
    return data?.[0] || null;
};

// 全レビュー取得
export const getAllVideoRatings = async (videoId: string) => {
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
        let youtube_id = videoId;
        if (isUuid) {
            const { data: vd, error: ve } = await supabase
                .from('videos')
                .select('youtube_id')
                .eq('id', videoId)
                .limit(1);
            if (!vd?.length || ve) return [];
            youtube_id = vd[0].youtube_id!;
        }
        const { data: ratingsData, error: re } = await supabase
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
        if (re) return [];
        return ratingsData || [];
    } catch {
        return [];
    }
};

// ユーザー単体レビュー取得
export const getUserVideoRating = async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
        let youtube_id = videoId;
        if (isUuid) {
            const { data: vd, error: ve } = await supabase
                .from('videos')
                .select('youtube_id')
                .eq('id', videoId)
                .limit(1);
            if (ve || !vd?.length) return null;
            youtube_id = vd[0].youtube_id!;
        }
        const { data: rd, error: re } = await supabase
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
            .eq('user_id', user.id)
            .limit(1);
        if (re) return null;
        return rd?.[0] || null;
    } catch {
        return null;
    }
};

// レビュー数更新 RPC 代替
export const updateVideoReviewCount = async (videoId: string): Promise<number> => {
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
        let uuid_id = videoId, youtube_id = videoId;
        if (isUuid) {
            const { data: vd } = await supabase.from('videos')
                .select('youtube_id').eq('id', videoId).limit(1);
            if (vd?.[0]?.youtube_id) youtube_id = vd[0].youtube_id;
        } else {
            const { data: vd } = await supabase.from('videos')
                .select('id').eq('youtube_id', videoId).limit(1);
            if (vd?.[0]?.id) uuid_id = vd[0].id;
        }
        const { count } = await supabase.from('video_ratings')
            .select('*', { count: 'exact' })
            .eq('video_id', youtube_id);
        await supabase.from('videos')
            .update({ review_count: count })
            .eq('id', uuid_id);
        return count || 0;
    } catch {
        throw new Error('レビュー数更新に失敗');
    }
};

// レビュー数順取得
export const getVideosByReviewCount = async (limit = 10, minReviews = 1): Promise<Video[]> => {
    try {
        const { data, error } = await supabase.from('videos')
            .select('id, title, youtube_id, review_count, thumbnail, channel_title, avg_rating, duration, genre_id, published_at, created_at, updated_at')
            .gt('review_count', minReviews - 1)
            .order('review_count', { ascending: false })
            .limit(limit);
        if (error) return [];
        return (data || []).map(vd => ({
            id: vd.id,
            title: vd.title || '',
            youtube_id: vd.youtube_id || '',
            review_count: vd.review_count || 0,
            thumbnail: vd.thumbnail || `https://i.ytimg.com/vi/${vd.youtube_id}/hqdefault.jpg`,
            channel_title: vd.channel_title || '',
            avg_rating: vd.avg_rating || 0,
            rating: vd.avg_rating || 0,
            description: '',
            view_count: 0,
            published_at: vd.published_at || '',
            genre_id: vd.genre_id || '',
            duration: vd.duration || '',
            created_at: vd.created_at || new Date().toISOString(),
            updated_at: vd.updated_at || new Date().toISOString(),
            youtuber: undefined
        }));
    } catch {
        return [];
    }
};

/**
 * 最新レビューID取得
 */
export async function getLatestReviewId(internalVideoId: string): Promise<string | null> {
    try {
        const { data: vd } = await supabase.from('videos')
            .select('id, youtube_id')
            .eq('id', internalVideoId)
            .single();
        if (!vd?.youtube_id) return null;
        const youtubeVideoId = vd.youtube_id;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data, error } = await supabase.from('video_ratings')
            .select('id')
            .eq('video_id', youtubeVideoId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
        if (error || !data?.length) return null;
        return data[0].id;
    } catch {
        return null;
    }
}
