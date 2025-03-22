// src/types/index.ts
import { ReactNode } from 'react';
import type { 
  PromotionSlot as PromotionSlotFromPromotion, 
  PromotionStats as PromotionStatsFromPromotion,
  SlotBooking
} from './promotion';

import type {
  Video as VideoType,
  VideoRating as VideoRatingType,
  VideoSearchParams,
  VideoSearchResult
} from './video';

export type RatingCategory =
  | 'overall'
  | 'clarity'
  | 'entertainment'
  | 'originality'
  | 'quality'
  | 'reliability'
  | 'usefulness';

export type RatingValue = 1 | 2 | 3 | 4 | 5;

// VideoRatingTypeをvideo.tsからインポートしたものに置き換え
export type VideoRating = VideoRatingType;

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

// VideoTypeをvideo.tsからインポートしたものに置き換え
export type Video = VideoType;

export interface Review {
    id: string;
    video_id: string;
    user_id: string;
    rating: number;
    comment: string;
    created_at: string;
    updated_at: string;
    helpful_count?: number;
    profiles?: {
        id: string;
        username: string;
        avatar_url: string;
    };
    videos?: Video;
}

// PromotionSlotインターフェースを./promotion.tsからインポートしたものを使用
export type PromotionSlot = PromotionSlotFromPromotion;

// PromotionStatsをpromotion.tsからインポートして使用
export type PromotionStats = PromotionStatsFromPromotion;

// SlotBookingをエクスポート
export type { SlotBooking };

// video.tsからビデオ関連の型をエクスポート
export type { VideoSearchParams, VideoSearchResult };

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
    verificationStatus: 'pending' | 'unknown' | 'verified' | 'rejected';
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
    onSubmit: () => Promise<void>; // asyncに対応する非同期関数
    initialRatings?: Partial<VideoRating>;
}

export interface VideoRatingDisplayProps {
  ratings: AggregatedVideoRating;
  showDetails?: boolean;
  allRatings?: VideoRating[];
  userRatings?: VideoRating[];
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