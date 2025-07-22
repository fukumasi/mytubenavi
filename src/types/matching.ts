/* eslint-disable @typescript-eslint/naming-convention */
/* ------------------------------------------------------------------
 *  公開列挙・基本型
 * ---------------------------------------------------------------- */
export enum OnlineStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY   = 'away',
  BUSY   = 'busy',
}

export enum ActivityLevel {
  VERY_ACTIVE = 'very_active',
  ACTIVE      = 'active',
  MODERATE    = 'moderate',
  CASUAL      = 'casual',
}

export enum ConnectionStatus {
  NONE      = 'none',
  PENDING   = 'pending',
  CONNECTED = 'connected',
  REJECTED  = 'rejected',
}

export enum GenderPreference {
  ANY   = 'any',
  MALE  = 'male',
  FEMALE= 'female',
}

/* ------------------------------------------------------------------
 *  プロファイル／ユーザー関連
 * ---------------------------------------------------------------- */
export interface MatchingUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  birth_date?: string | null;
  gender: string;
  interests: string[];
  matching_score: number;
  is_premium: boolean;

  /* 追加プロパティ ------------------------------ */
  age: number | null;
  location: {
    prefecture?: string;
    region?: string;
  } | null;

  activity_level?: number;
  online_status?: string;
  last_active?: string;
  connection_status?: string;
  is_liked?: boolean;
  is_matched?: boolean;
  conversation_id?: string;
  channel_url?: string;
  viewing_trends?: Record<string, number>;
  common_friends?: {
    id: string;
    username: string;
    avatar_url?: string | null;
  }[];
  connection_id?: string | null;
  is_initiator?: boolean;
  phone_verified?: boolean;

  /* マッチング用 --------------------------------- */
  common_interests: string[];
  common_genres?: string[];
  common_videos_count?: number;
}

export interface SkippedUser extends MatchingUser {
  skipped_at: string;
  birth_date?: string | null;
}

/* ------------------------------------------------------------------
 *  ★ MatchingPreferences 型は preferences.ts に一本化 ★
 *    → ここでは再エクスポートのみ行い、重複定義を排除
 * ---------------------------------------------------------------- */
export type { MatchingPreferences } from '@/types/preferences';

/* ------------------------------------------------------------------
 *  ポイント & 取引
 * ---------------------------------------------------------------- */
export interface UserPoints {
  balance: number;
  lifetime_earned: number;
  last_updated: string;
}

export type TransactionType =
  | 'review'
  | 'purchase'
  | 'message'
  | 'profile_view'
  | 'refund'
  | 'login_bonus'
  | 'streak_bonus'
  | 'like'
  | 'match_bonus'
  | 'message_activity'
  | 'filter_usage'
  | 'intimacy_level_up';

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: TransactionType;
  reference_id?: string;
  created_at: string;
  description?: string;
}

/* ------------------------------------------------------------------
 *  認証・メッセージ
 * ---------------------------------------------------------------- */
export interface VerificationStatus {
  email_verified: boolean;
  phone_verified: boolean;
  id_verified: boolean;
  verification_level: number;
  verification_provider?: string;
  last_verified?: string;
  verification_expiry?: string;
}

export interface MessageAttachment {
  id?: string;
  message_id: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
  thumbnail_url?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id: string;
  content: string;
  is_highlighted: boolean;
  is_read: boolean;
  has_attachment?: boolean;
  created_at: string;
  updated_at: string;
  deleted_by_sender?: boolean;
  deleted_by_receiver?: boolean;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_time: string;
  is_active: boolean;
  user1_unread_count: number;
  user2_unread_count: number;
  intimacy_level?: number;
}

export interface ConversationWithProfile extends Conversation {
  otherUser: {
    id: string;
    username: string;
    avatar_url?: string | null;
    is_premium?: boolean;
    online_status?: OnlineStatus | string;
    last_active?: string;
    verification_level?: number;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    is_read: boolean;
    is_highlighted?: boolean;
    has_attachment?: boolean;
  } | null;
  unread_count: number;
}

/* ------------------------------------------------------------------
 *  動画関連
 * ---------------------------------------------------------------- */
export interface VideoDetails {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  channel_name?: string;
  description?: string;
  published_at?: string;
  duration?: number;
  view_count?: number;
}

/* ------------------------------------------------------------------
 *  マッチング結果
 * ---------------------------------------------------------------- */
export interface MatchingProfileDetails {
  profile: MatchingUser;
  commonInterests: string[];
  commonVideos: VideoDetails[];
}

export interface ActivityData {
  loginCount: number;
  commentCount: number;
  ratingCount: number;
  messageCount: number;
  lastLogin?: string;
  activityScore: number;
}

export interface UserSkip {
  id: string;
  user_id: string;
  skipped_user_id: string;
  created_at: string;
}

export interface UserLike {
  id: string;
  user_id: string;
  liked_user_id: string;
  created_at: string;
}

export interface UserMatch {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
}

export interface LocationPreference {
  prefecture?: string;
  region?: string;
}

/** いいね送信結果 */
export interface SendLikeResult {
  success: boolean;
  isMatch: boolean;
  error?: string;
}

/* ------------------------------------------------------------------
 *  viewing.ts の型をそのまま再エクスポート
 * ---------------------------------------------------------------- */
export * from './viewing';

/* ------------------------------------------------------------------
 *  視聴傾向込み拡張ユーザー
 * ---------------------------------------------------------------- */
export interface EnhancedMatchingUser extends MatchingUser {
  viewing_stats?: ViewingStats;
  content_similarity?: number;
  rating_correlation?: number;
  viewing_pattern_match?: number;
  genre_similarity?: number;
  match_details?: {
    common_videos: CommonVideo[];
    match_reasons: string[];
    similarity_breakdown: {
      content: number;
      rating: number;
      timing: number;
      genre: number;
    };
  };
}

/* ------------------------------------------------------------------
 *  内部計算用
 * ---------------------------------------------------------------- */
export interface MatchingCandidateExtended {
  user_id: string;
  candidate_id: string;
  similarity: number;
  content_similarity?: number;
  rating_correlation?: number;
  viewing_pattern_match?: number;
  genre_similarity?: number;
  common_videos_count: number;
  match_reason?: Record<string, any>;
  calculated_at: string;
  expires_at: string;
}

/* ------------------------------------------------------------------
 *  ダブり防止の補足型
 * ---------------------------------------------------------------- */
export interface ViewingStats {
  total_videos: number;
  unique_categories: number;
  avg_completion_rate: number;
  avg_rating: number;
  total_viewing_time: number;
  last_viewing: string;
}

export interface CommonVideo {
  video_id: string;
  video_title?: string;
  user1_rating?: number;
  user2_rating?: number;
  user1_completion?: number;
  user2_completion?: number;
}
