import { ReactNode } from 'react';

export type RatingCategory =
  | 'overall'
  | 'clarity'
  | 'entertainment'
  | 'originality'
  | 'quality'
  | 'reliability'
  | 'usefulness';

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface VideoRating {
  id: string;                 
  video_id: string;          
  user_id: string;           
  profiles?: {               
    username: string;
    avatar_url: string;
  };
  overall: number;
  clarity: number;
  entertainment: number;
  originality: number;
  quality: number;
  reliability: number;
  usefulness: number;
  comment: string;
}

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
    channel_id?: string;
    subscribers?: number;
    video_count?: number;
    total_views?: number;
}

export interface AggregatedVideoRating {
  reliability: AggregatedRating;
  entertainment: AggregatedRating;
  usefulness: AggregatedRating;
  quality: AggregatedRating;
  originality: AggregatedRating;
  clarity: AggregatedRating;
  overall: AggregatedRating;
}

export interface AggregatedRating {
  averageRating: number;
  totalRatings: number;
  distribution: {
    [K in RatingValue]: number;
  };
}

export interface Video {
    id: string;
    youtube_id: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    view_count: number;
    rating: number;
    published_at: string;
    channel_title: string;
    genre_id?: string;
    created_at?: string;
    updated_at?: string;
    review_count: number;
    avg_rating?: number;
    ratings?: AggregatedVideoRating;
    channel_id?: string;
    youtuber?: {
        channelName: string;
        channelUrl: string;
        verificationStatus: 'unknown' | 'pending' | 'verified' | 'rejected';
        channel_id?: string;
    };
 }
export interface Review {
    id: string;
    video_id: string;
    user_id: string;
    rating: number;
    comment: string;
    created_at: string;
    updated_at: string;
    helpful_count?: number;  // 追加
    profiles?: {
        id: string;
        username: string;
        avatar_url: string;
    };
    videos?: Video;
}

// PromotionSlot型の修正 - データベーススキーマに合わせる
export interface PromotionSlot {
    id: string;
    name: string;
    type: 'premium' | 'sidebar' | 'genre' | 'related';
    price: number;
    max_videos: number;
    description?: string;
    youtube_id?: string; 
    created_at?: string;
    updated_at?: string;
    status: 'available' | 'inactive';
    video_id?: string; // データベースにあるフィールド
    // 以下は実際のデータベースにはないが、UIで使用されるフィールド
    bookings?: Array<{
        count: number;
    }>;
    current_bookings_count?: number;
    total_earnings?: number;
}

// SlotBookingを削除し、types/promotion.tsで定義したものを使用する
// export interface SlotBooking { ... }

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
    enablejsapi?: 0 | 1;  // 追加
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
    verificationStatus: 'pending' | 'unknown' | 'verified' | 'rejected';  // Video型と合わせる
    channel_id?: string;
    avatar_url?: string;
    subscribers?: number;
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

// export type Review = BaseEntity & { //削除
//     video_id: string;
//     user_id: string;
//     rating: number;
//     comment: string;
//     profiles?: {
//         id: string;
//         username: string;
//         avatar_url: string;
//     };
//     helpful_count?: number;
// }

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

export interface VideoRatingFormProps {
    videoId: string;
    onSubmit: () => Promise<void>; // asyncに対応する非同期関数に変更
    initialRatings?: Partial<VideoRating>;
  }

export interface VideoRatingDisplayProps {
  ratings: AggregatedVideoRating;
  showDetails?: boolean;
  allRatings?: VideoRating[];   // 追加
  userRatings?: VideoRating[];  // 追加
}


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