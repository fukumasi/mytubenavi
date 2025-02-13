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
} from '../types';

// チャンネル統計の型定義 (ファイル 2 から移動)
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
    youtube_id: video.youtube_id,
    mytubenavi_comment_count: video.mytubenavi_comment_count,
    likeCount: video.like_count,
    avg_rating: video.avg_rating,
    review_count: video.review_count,
    tags: video.tags,
    created_at: video.created_at || new Date().toISOString(), // デフォルト値を追加
    updated_at: video.updated_at || new Date().toISOString(), // デフォルト値を追加
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

// 人気動画取得（評価順）
export const getPopularVideosByRating = async (limit: number = 10): Promise<Video[]> => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('avg_rating', { ascending: false })
            .order('review_count', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(video => mapSupabaseVideoToVideo(video as SupabaseVideo));
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

// レビュー関連の関数
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

// レビュー投稿
export const postReview = async (
    videoId: string,
    rating: number,
    comment: string
) => {
    const { data, error } = await supabase
        .from('reviews')
        .insert([{
            video_id: videoId,
            rating,
            comment,
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

// レビュー更新
export const updateReview = async (
    reviewId: string,
    rating: number,
    comment: string
) => {
    const { data, error } = await supabase
        .from('reviews')
        .update({
            rating,
            comment,
            updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// レビュー削除
export const deleteReview = async (reviewId: string) => {
    const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

    if (error) throw error;
};


// レビュー投稿/更新（既存の関数と統合）
// export const postOrUpdateReview = async (videoId: string, rating: number, comment: string): Promise<Review> => { //コメントアウト：重複のため
//     const { data: { user }, error: authError } = await supabase.auth.getUser();

//     if (authError || !user) {
//         throw new Error('ログインが必要です');
//     }

//     try {
//         // 既存のレビューを確認
//         const { data: existingReview } = await supabase
//             .from('reviews')
//             .select('id')
//             .match({ user_id: user.id, video_id: videoId })
//             .single();

//         let result;

//         if (existingReview) {
//             // 既存のレビューを更新
//             const { data, error } = await supabase
//                 .from('reviews')
//                 .update({
//                     rating,
//                     comment,
//                     updated_at: new Date().toISOString()
//                 })
//                 .eq('id', existingReview.id)
//                 .select(`
//                     id,
//                     video_id,
//                     user_id,
//                     rating,
//                     comment,
//                     created_at,
//                     updated_at,
//                     profiles!reviews_user_id_fkey (
//                         id,
//                         username,
//                         avatar_url
//                     )
//                 `)
//                 .single();

//             if (error) throw error;
//             result = data;
//         } else {
//             // 新規レビューを投稿
//             const { data, error } = await supabase
//                 .from('reviews')
//                 .insert([{
//                     video_id: videoId,
//                     user_id: user.id,
//                     rating,
//                     comment,
//                     created_at: new Date().toISOString(),
//                     updated_at: new Date().toISOString()
//                 }])
//                 .select(`
//                     id,
//                     video_id,
//                     user_id,
//                     rating,
//                     comment,
//                     created_at,
//                     updated_at,
//                     profiles!reviews_user_id_fkey (
//                         id,
//                         username,
//                         avatar_url
//                     )
//                 `)
//                 .single();

//             if (error) throw error;
//             result = data;
//         }

//         return mapSupabaseReviewToReview(result);
//     } catch (error: any) {
//         console.error('Error posting/updating review:', error);
//         throw error;
//     }
// };


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
// export const addViewHistory = async (videoId: string): Promise<void> => { // コメントアウト：重複のため
//     const { error } = await supabase
//         .from('view_history')
//         .insert([{
//             video_id: videoId,
//             viewed_at: new Date().toISOString()
//         }]);

//     if (error) throw error;
// };

// export const getViewHistory = async (): Promise<Video[]> => {  // コメントアウト：重複のため
//     const { data, error } = await supabase
//         .from('view_history')
//         .select(`
//       video_id,
//       videos:video_id (*)
//     `)
//         .order('viewed_at', { ascending: false });

//     if (error) throw error;

//     return (data || [])
//         .map(item => {
//             if (item.videos && typeof item.videos === 'object' && !Array.isArray(item.videos)) {
//                 return mapSupabaseVideoToVideo(item.videos as unknown as SupabaseVideo);
//             }
//             return null;
//         })
//         .filter((video): video is Video => video !== null);
// };

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

// チャンネル統計を取得する関数 (ファイル 2 から移動)
// ファイルの最後を以下のように修正
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