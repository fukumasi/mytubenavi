// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { YouTubeAPI, extractVideoId } from './youtube';
import type {
    Video,
    Review,
    Genre,
    Profile,
    SupabaseVideo,
    SearchResult,
    Event,
    EventParticipant,
    ChannelStats,
    ViewData,
    SubscriberData
} from '../types';

// Supabase初期化
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SupabaseVideo型からVideo型への変換
const mapSupabaseVideoToVideo = (video: SupabaseVideo): Video => ({
    id: video.id,
    title: video.title || '',
    description: video.description || '',
    thumbnail: video.thumbnail || '',
    duration: video.duration || '',
    viewCount: video.view_count || 0,
    rating: video.rating || 0,
    genre_id: video.genre_id,
    publishedAt: video.published_at,
    channelTitle: video.channel_title || '',
    youtuber: video.youtuber,
    commentCount: video.comment_count || 0,
    youtube_id: video.youtube_id
});

const mapSupabaseReviewToReview = (review: any): Review => ({
    id: review.id,
    video_id: review.video_id,
    user_id: review.user_id,
    rating: review.rating,
    comment: review.comment,
    created_at: new Date(review.created_at).toISOString(),
    updated_at: new Date(review.updated_at).toISOString(),
    profiles: review.profiles ? {
        id: review.profiles.id,
        username: review.profiles.username,
        avatar_url: review.profiles.avatar_url
    } : undefined
 });


// 最近の動画取得
export const getRecentVideos = async (limit: number = 30): Promise<Video[]> => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('published_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(video => mapSupabaseVideoToVideo(video as SupabaseVideo));
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
        return (data || []).map(video => mapSupabaseVideoToVideo(video as SupabaseVideo));
    } catch (err) {
        console.error('Error fetching popular videos:', err);
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
            .is('parent_id', null)
            .order('order');

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
            .eq('parent_id', parent.id)
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
                : 0,
            published_at: details.snippet?.publishedAt || new Date().toISOString(),
            channel_title: details.snippet?.channelTitle || '',
            youtuber: {
                channelName: details.snippet?.channelTitle || '',
                channelUrl: `https://www.youtube.com/channel/${details.snippet?.channelId || ''}`,
                verificationStatus: 'unknown'
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
                return mapSupabaseVideoToVideo(item.videos as unknown as SupabaseVideo);
            }
            return null;
        })
        .filter((video): video is Video => video !== null);
};

export const getFavoriteStatus = async (videoId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('video_id', videoId)
        .single();

    if (error) return false;
    return !!data;
};

export const toggleFavorite = async (videoId: string): Promise<boolean> => {
    const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('video_id', videoId)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('video_id', videoId);

        if (error) throw error;
        return false;
    } else {
        const { error } = await supabase
            .from('favorites')
            .insert([{ video_id: videoId }]);

        if (error) throw error;
        return true;
    }
};

// レビュー関連の関数を修正
export const getVideoReviews = async (videoId: string): Promise<Review[]> => {
    const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          video_id,
          user_id,
          rating,
          comment,
          created_at,
          updated_at,
          profiles!reviews_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
        throw error;
    }

    return (data || []).map(review => mapSupabaseReviewToReview(review));
};

// レビュー投稿前のチェック
async function checkExistingReview(userId: string, videoId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .match({ user_id: userId, video_id: videoId })
        .maybeSingle();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return !!data;
}

export const postReview = async (videoId: string, rating: number, comment: string): Promise<Review> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('ログインが必要です');
    }

    try {
        const hasExistingReview = await checkExistingReview(user.id, videoId);
        if (hasExistingReview) {
            throw new Error('この動画には既にレビューを投稿済みです');
        }

        const { data, error } = await supabase
            .from('reviews')
            .insert([
                {
                    video_id: videoId,
                    user_id: user.id,
                    rating,
                    comment
                }
            ])
            .select(`
                id,
                video_id,
                user_id,
                rating,
                comment,
                created_at,
                updated_at,
                profiles!reviews_user_id_fkey (
                    id,
                    username,
                    avatar_url
                )
            `)
            .single();

        if (error) {
            throw error;
        }

        return mapSupabaseReviewToReview(data);
    } catch (error: any) {
        console.error('Error posting review:', error);
        throw error;
    }
};


export const updateReview = async (
    reviewId: string,
    rating: number,
    comment: string
): Promise<Review> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('ログインが必要です');
    }

    const { data, error } = await supabase
        .from('reviews')
        .update({ rating, comment })
        .eq('id', reviewId)
        .eq('user_id', user.id)
        .select(`
      id,
      video_id,
      user_id,
      rating,
      comment,
      created_at,
      updated_at,
        profiles!reviews_user_id_fkey (
            id,
            username,
            avatar_url
        )
    `)
        .single();

    if (error) throw error;
    return mapSupabaseReviewToReview(data);
};

export const getUserReviews = async (): Promise<Review[]> => {
    const { data, error } = await supabase
        .from('reviews')
        .select(`
      id,
      video_id,
      user_id,
      rating,
      comment,
      created_at,
      updated_at,
      profiles!reviews_user_id_fkey (
        id,
        username,
        avatar_url
      )
    `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(review => mapSupabaseReviewToReview(review));
};

// 視聴履歴関連の関数
export const addViewHistory = async (videoId: string): Promise<void> => {
    const { error } = await supabase
        .from('view_history')
        .insert([{
            video_id: videoId,
            viewed_at: new Date().toISOString()
        }]);

    if (error) throw error;
};

export const getViewHistory = async (): Promise<Video[]> => {
    const { data, error } = await supabase
        .from('view_history')
        .select(`
      video_id,
      videos:video_id (*)
    `)
        .order('viewed_at', { ascending: false });

    if (error) throw error;

    return (data || [])
        .map(item => {
            if (item.videos && typeof item.videos === 'object' && !Array.isArray(item.videos)) {
                return mapSupabaseVideoToVideo(item.videos as unknown as SupabaseVideo);
            }
            return null;
        })
        .filter((video): video is Video => video !== null);
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

        const videos = (data || []).map(video => mapSupabaseVideoToVideo(video as SupabaseVideo));

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

// チャンネル統計情報の取得
export const getChannelStats = async (userId: string): Promise<ChannelStats> => {
    const { data: videos, error } = await supabase
        .from('videos')
        .select('*')
        .eq('channelTitle', userId);

    if (error) throw error;

    const publishedVideos = videos?.filter(v => v.published_at) || [];
    const draftVideos = videos?.filter(v => !v.published_at) || [];

    const viewsGrowth = await calculateViewsGrowth(userId);
    const subscribersGrowth = await calculateSubscribersGrowth(userId);

    const { data: views } = await supabase
        .from('channel_stats')
        .select('view_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    const { data: subscribers } = await supabase
        .from('channel_stats')
        .select('subscriber_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    const viewsData: ViewData[] = (views || [])?.map(v => ({
        date: new Date(v.created_at).toISOString(),
        views: v.view_count
    })) || [];

    const subscribersData: SubscriberData[] = (subscribers || [])?.map(s => ({
        date: new Date(s.created_at).toISOString(),
        subscribers: s.subscriber_count
    })) || [];

    return {
        totalViews: videos?.reduce((sum, video) => sum + (video.view_count || 0), 0) || 0,
        totalSubscribers: await getSubscriberCount(userId),
        averageRating: publishedVideos.reduce((sum, video) => sum + (video.rating || 0), 0) / publishedVideos.length || 0,
        totalVideos: videos?.length || 0,
        publishedVideos: publishedVideos.length,
        draftVideos: draftVideos.length,
        viewsGrowth,
        subscribersGrowth,
        viewsData,
        subscribersData
    };
};

// 動画の公開
export const publishVideo = async (videoId: string): Promise<void> => {
    const { error } = await supabase
        .from('videos')
        .update({ published_at: new Date().toISOString() })
        .eq('id', videoId);

    if (error) throw error;
};

// 動画の削除
export const deleteVideo = async (videoId: string): Promise<void> => {
    const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

    if (error) throw error;
};

// 視聴回数の成長率計算
const calculateViewsGrowth = async (userId: string): Promise<number> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: views } = await supabase
        .from('channel_stats')
        .select('view_count, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

    if (!views?.length) return 0;

    const oldViews = views[0]?.view_count || 0;
    const newViews = views[views.length - 1]?.view_count || 0;

    return oldViews ? ((newViews - oldViews) / oldViews) * 100 : 0;
};

// チャンネル登録者数の取得
const getSubscriberCount = async (userId: string): Promise<number> => {
    const { data, error } = await supabase
        .from('channel_stats')
        .select('subscriber_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) return 0;
    return data?.subscriber_count || 0;
};

// チャンネル登録者数の成長率計算
const calculateSubscribersGrowth = async (userId: string): Promise<number> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: subscribers } = await supabase
        .from('channel_stats')
        .select('subscriber_count, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

    if (!subscribers?.length) return 0;

    const oldCount = subscribers[0]?.subscriber_count || 0;
    const newCount = subscribers[subscribers.length - 1]?.subscriber_count || 0;

    return oldCount ? ((newCount - oldCount) / oldCount) * 100 : 0;
};


export default supabase;