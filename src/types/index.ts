import { ReactNode } from 'react';

// Baseとなる共通の型
type BaseEntity = {
  id: string;
  created_at?: string;
  updated_at?: string;
};

// Component Props Types
export type BaseProps = {
  children?: ReactNode;
  className?: string;
};

// Video関連の型
export type Youtuber = {
  channelName: string;
  channelUrl: string;
  verificationStatus: 'verified' | 'unverified' | 'unknown';
};

export type Video = BaseEntity & {
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  viewCount: number;
  rating: number;
  genre?: string;
  publishedAt: string;
  channelTitle: string;
  youtuber?: Youtuber;
  commentCount: number;
  youtubeId: string;
};

export type SupabaseVideo = BaseEntity & {
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  view_count: number;
  rating: number;
  genre?: string;
  published_at: string;
  channelTitle: string;
  youtuber?: Youtuber;
  comment_count?: number;
  youtube_id: string;
};

// Event関連の型
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

// Profile関連の型
export type Profile = BaseEntity & {
  username: string;
  avatar_url: string;
  channel_url?: string;
  description?: string;
};

// Genre関連の型
export type Genre = BaseEntity & {
  slug: string;
  name: string;
  parent_id: number | null;
  order: number;
};

// Review関連の型
export interface Review {
  id: string;
  videoId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  profiles?: {
    id: string;
    username: string;
    avatarUrl: string;
  };
}

// Supabaseから返ってくるレビューデータの型
export interface SupabaseReview {
  id: string;
  video_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

// 検索関連の型
export interface SearchResult {
  videos: Video[];
  totalPages: number;
}

// イベント参加者関連の型
export interface EventParticipant {
  user_id: string;
  event_id: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

// チャンネル統計関連の型
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

// Auth関連の型
export type AuthUser = {
  id: string;
  email: string;
  user_metadata?: {
    username?: string;
    avatar_url?: string;
  };
};

// Component Props Types
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

// Video フィルター用の型
export type VideoFilter = {
  genre?: string;
};

// ソートオプション用の型
export type SortOption = {
  field: 'publishedAt' | 'viewCount' | 'rating';
  direction: 'asc' | 'desc';
};

export default BaseEntity;