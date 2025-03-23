// src/types/matching.ts

export interface MatchingUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  interests: string[];
  matching_score: number;
  common_interests: string[];
  common_genres?: string[];
  common_videos_count?: number;
  is_premium: boolean;
  gender: string;
  age: number | null;
  location: {
    prefecture?: string;
    region?: string;
  } | null;
  activity_level?: number | string;
  online_status?: string;
  last_active?: string | Date;
  connection_status?: 'none' | 'pending' | 'connected' | 'rejected';
  // 新しく追加するプロパティ
  channel_url?: string;
  viewing_trends?: Record<string, number>;
  common_friends?: Array<{
    id: string;
    username: string;
    avatar_url?: string | null;
  }>;
 }
 
 export interface SkippedUser extends MatchingUser {
  skipped_at: string; // スキップした日時
 }
 
 export interface MatchingPreferences {
  gender_preference: string;
  age_range_min: number;
  age_range_max: number;
  location_preference: {
    prefecture?: string;
    region?: string;
  };
  interest_tags: string[];
  genre_preference: string[];
  activity_level: string;
  max_distance?: number; // km単位での最大距離
  online_only?: boolean; // オンラインユーザーのみを表示するかどうか
  premium_only?: boolean; // プレミアムユーザーのみを表示するかどうか
  min_common_interests?: number; // 最小共通興味数
  has_video_history?: boolean; // 視聴履歴があるユーザーのみを表示
  recent_activity?: boolean; // 最近活動したユーザーのみを表示
  filter_skipped?: boolean; // スキップしたユーザーを表示しないかどうか
 }
 
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
  | 'filter_usage'; 
 
 export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: TransactionType;
  reference_id?: string;
  created_at: string;
  description?: string;
 }
 
 export interface VerificationStatus {
  email_verified: boolean;
  phone_verified: boolean;
  id_verified: boolean;
  verification_level: number;
  verification_provider?: string;
  last_verified?: string;
  verification_expiry?: string;
 }
 
 export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id: string;
  content: string;
  is_highlighted: boolean;
  is_read: boolean;
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
 }
 
 export interface ConversationWithProfile extends Conversation {
  otherUser: {
    id: string;
    username: string;
    avatar_url?: string | null;
    is_premium?: boolean;
    online_status?: string;
    last_active?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    is_read: boolean;
  } | null;
  unread_count: number;
 }
 
 export interface VideoDetails {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  channel_name?: string;
 }
 
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