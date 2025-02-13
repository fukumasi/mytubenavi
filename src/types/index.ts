import { ReactNode } from 'react';

type BaseEntity = {
    id: string;
    created_at?: string;
    updated_at?: string;
};

export type BaseProps = {
    children?: ReactNode;
    className?: string;
};

export interface Profile {
    id: string;
    username: string;
    avatar_url?: string;
    role?: 'user' | 'youtuber' | 'admin';
    channel_url?: string;
    description?: string;
    category?: string;
    created_at?: string;
    updated_at?: string;
    // YouTuber 関連フィールド (PromotionSlot, SlotBooking で使用)
    channel_id?: string;       // YouTube チャンネルID
    subscribers?: number;   // チャンネル登録者数
    video_count?: number;     // 動画数
    total_views?: number;   // 総視聴回数
}

export interface Video {
    avg_rating?: number;
    review_count?: number;
    mytubenavi_comment_count?: number;
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    viewCount: number;
    rating: number;
    publishedAt: string;
    channelTitle: string;
    commentCount?: number;
    youtube_id: string;
    genre_id?: string;
    created_at?: string;
    updated_at?: string;
    youtuber?: {
        channelName: string;
        channelUrl: string;
        verificationStatus: 'unknown' | 'pending' | 'verified' | 'rejected';
        // YouTuber 関連 (ダッシュボード用)
        channel_id?: string;      // チャンネルID
        avatar_url?: string;        // アバターURL
        subscribers?: number; // 登録者数
    };
}

export interface PromotionSlot {
    id: string;
    youtuber_id: string; // ProfileのIDを参照
    name: string;
    type: 'premium' | 'sidebar' | 'genre' | 'related';
    price: number;
    max_videos: number;
    description?: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
    status: 'active' | 'inactive';
    available_count?: number; // 元のファイルから移動
    bookings?: Array<{
        count: number;
    }>;
    current_bookings_count?: number;
    total_earnings?: number;
    position?: 'top' | 'side' | 'bottom';
    visibility?: 'public' | 'private';
    start_time?: string;
    end_time?: string;
    target_genres?: string[];
}

export interface SlotBooking {
    id: string;
    user_id: string;     // ProfileのIDを参照
    slot_id: string;    // PromotionSlotのIDを参照
    video_id: string;   // VideoのIDを参照
    start_date: string;
    end_date: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    total_price: number;
    created_at: string;
    updated_at: string;
    payment_status?: 'pending' | 'paid' | 'refunded';
    payment_id?: string;
    promotion_slot?: PromotionSlot;
    video?: Video;
}

export interface PromotionStats {
    totalBookings: number;
    totalRevenue: number;
    activeBookings: number;
    averageRating: number;
    viewsData: Array<{
        date: string;
        views: number;
        clicks: number;
        revenue: number;
        ctr: number;
    }>;
    averageCTR: number;
    dailyStats?: Array<{
        date: string;
        bookings_count: number;
        revenue: number;
        views: number;
    }>;
    slotStats?: Array<{
        slot_id: string;
        slot_name: string;
        total_bookings: number;
        total_revenue: number;
        average_duration: number;
    }>;
}


export interface Comment {
    id: string;
    video_id: string;
    user_id: string;
    content: string;
    parent_id?: string;
    likes_count: number;
    created_at: string;
    updated_at?: string;
    profiles?: {
        id: string;
        username: string;
        avatar_url: string;
    };
    videos?: {
        title: string;
        thumbnail: string;
    };
    replies?: Comment[];
    replies_count: number;
}

export interface Genre {
    id: string;
    name: string;
    slug: string;
    parent_genre_id: string | null;
    icon?: string;
    subGenres?: Genre[];
    order?: number;
    description?: string;
    // 中ジャンル関連のプロパティ
    is_middle_genre?: boolean;
    parent_genre?: Genre | null; // 親ジャンルへの参照 (nullを許容)
    middle_genres?: Genre[];
    child_genres?: Genre[];
    level?: 'main' | 'middle' | 'sub';
    path?: string[]; // ジャンル階層のパス
}

export interface YouTubeEvent {
    data: number;
    target: any;
}

export interface YouTubePlayerVars {
    autoplay?: 0 | 1;
    modestbranding?: 0 | 1;
    rel?: 0 | 1;
    controls?: 0 | 1;
    enablejsapi?: 0 | 1;
    origin?: string;
}

// src/components/video/VideoPlayer.tsx で定義されていた型定義をこちらに移動
export interface YouTubePlayerConfig {
    videoId: string;
    width?: string | number;
    height?: string | number;
    playerVars?: YouTubePlayerVars;
    events?: {
        onReady?: () => void;
        onStateChange?: (event: YouTubeEvent) => void;
        onError?: () => void;
    };
}

export type Youtuber = {
    channelName: string;
    channelUrl: string;
    verificationStatus: 'verified' | 'unverified' | 'unknown';
    // YouTuber 関連 (ダッシュボード用)  <- こちらは不要
    // channel_id?: string;
    // avatar_url?: string;
    // subscribers?: number;

};

// Supabaseのビデオテーブルのインターフェース
export interface SupabaseVideo extends BaseEntity {
    title: string;
    description: string;
    thumbnail: string;
    channel_title: string;
    published_at: string;
    view_count: number;
    like_count?: number;
    comment_count?: number;
    duration: string;
    tags: string[];
    avg_rating?: number;
    review_count?: number;
    mytubenavi_comment_count?: number;
    genre_id?: string;
    subgenre_id?: string;
    youtube_id: string;
    rating?: number;
    youtuber?: Youtuber;
}

export type Event = BaseEntity & {
    title: string;
    description: string;
    eventType: 'online' | 'offline';
    startDate: Date;
    endDate: Date;
    location?: string;
    onlineUrl?: string;
    maxParticipants?: number;
    price: number;
    thumbnailUrl?: string;
    organizerId: string;
    status: 'draft' | 'published' | 'cancelled';
    isFeatured: boolean;
};

export type Review = BaseEntity & {
    video_id: string;
    user_id: string;
    rating: number;
    comment: string;
    profiles?: {
        id: string;
        username: string;
        avatar_url: string;
    };
    helpful_count?: number;
}

export interface SupabaseReview extends BaseEntity {
    video_id: string;
    user_id: string;
    rating: number;
    comment: string;
    profiles?: {
        id: string;
        username: string;
        avatar_url: string;
    };
}

export interface SearchResult {
    videos: Video[];
    totalPages: number;
}

export interface EventParticipant {
    user_id: string;
    event_id: string;
    profiles?: {
        username: string;
        avatar_url: string;
    };
}

export interface ChannelStats {
    totalViews: number;
    totalSubscribers: number;
    averageRating: number;
    totalVideos: number;
    publishedVideos: number;
    draftVideos: number;
    viewsGrowth: number;
    subscribersGrowth: number;
    viewsData: ViewData[];
    subscribersData: SubscriberData[];
}

export interface ViewData {
    date: string;
    views: number;
}

export interface SubscriberData {
    date: string;
    subscribers: number;
}

export type AuthUser = {
    id: string;
    email: string;
    user_metadata?: {
        username?: string;
        avatar_url?: string;
    };
};

export type VideoCardProps = BaseProps & {
    video: Video;
    onVideoClick?: (video: Video) => void;
};

export type EventCardProps = BaseProps & {
    event: Event;
    onEventClick?: (event: Event) => void;
};

export type GenreListProps = BaseProps & {
    onGenreClick?: (genre: Genre) => void;
};

export type VideoListProps = BaseProps & {
    videos: Video[];
    loading?: boolean;
};

export type VideoFilter = {
    genre_id?: string;
};

export type SortOption = {
    field: 'published_at' | 'view_count' | 'rating';
    direction: 'asc' | 'desc';
};

declare global {
    interface Window {
        YT?: {
            Player: new (
                elementId: string | HTMLElement,
                config: {
                    videoId: string;
                    width?: string | number;
                    height?: string | number;
                    playerVars?: {
                        autoplay?: 0 | 1;
                        controls?: 0 | 1;
                        disablekb?: 0 | 1;
                        enablejsapi?: 0 | 1;
                        fs?: 0 | 1;
                        modestbranding?: 0 | 1;
                        playsinline?: 0 | 1;
                        rel?: 0 | 1;
                    };
                    events?: {
                        onReady?: () => void;
                        onStateChange?: (event: { data: number }) => void;
                        onError?: (event: { data: number }) => void;
                    };
                }
            ) => Player;
            PlayerState: {
                UNSTARTED: -1;
                ENDED: 0;
                PLAYING: 1;
                PAUSED: 2;
                BUFFERING: 3;
                CUED: 5;
            };
        };
        onYouTubeIframeAPIReady?: () => void;
    }
}

export class Player {
    constructor(
        public elementId: string | HTMLElement,
        public config: {
            videoId: string;
            width?: string | number;
            height?: string | number;
            playerVars?: {
                autoplay?: 0 | 1;
                controls?: 0 | 1;
                disablekb?: 0 | 1;
                fs?: 0 | 1;
                modestbranding?: 0 | 1;
                playsinline?: 0 | 1;
                rel?: 0 | 1;
            };
            events?: {
                onReady?: () => void;
                onStateChange?: (event: { data: number }) => void;
                onError?: (event: { data: number }) => void;
            };
        }
    ) { }

    playVideo() { }
    pauseVideo() { }
    stopVideo() { }
    destroy() { }
    getPlayerState(): number {
        return -1;
    }
    getCurrentTime(): number {
        return 0;
    }
    getDuration(): number {
        return 0;
    }
}

export interface SupabaseVideoResponse {
    id: string;
    videos: {
        id: string;
        title: string;
        description: string;
        thumbnail: string;
        duration: string;
        view_count: number;
        rating: number;
        avg_rating: number;
        review_count: number;
        published_at: string;
        channel_title: string;
        youtube_id: string;
        genre_id: string;
    }[];
}

export interface FavoriteVideo extends BaseEntity {
    user_id: string;
    video_id: string;
    video?: Video;
    created_at: string;
}

export default BaseEntity;