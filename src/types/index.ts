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
  genre_id?: string;
  publishedAt: string;
  channelTitle: string;
  youtuber?: Youtuber;
  commentCount: number;
  youtube_id: string;
};

export type SupabaseVideo = BaseEntity & {
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  view_count: number;
  rating: number;
  genre_id?: string;
  published_at: string;
  channel_title: string;
  youtuber?: Youtuber;
  comment_count?: number;
  youtube_id: string;
};

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

export type Profile = BaseEntity & {
  username: string;
  avatar_url: string;
  channel_url?: string;
  description?: string;
};

export type Genre = BaseEntity & {
  slug: string;
  name: string;
  parent_id: string | null;
  order: number;
  icon?: string;
  description?: string;
};

export interface Review extends BaseEntity {
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
  ) {}

  playVideo() {}
  pauseVideo() {}
  stopVideo() {}
  destroy() {}
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
    published_at: string;
    channel_title: string;
    youtube_id: string;
    genre_id: string;
  }[];
}

export default BaseEntity;
