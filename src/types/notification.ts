// src/types/notification.ts

export type NotificationType = 
  | 'video_comment' 
  | 'review_reply' 
  | 'like' 
  | 'follow' 
  | 'system'
  | 'new_video'
  | 'review_mention'
  | 'rating'
  | 'favorite'
  | 'mention'
  | 'achievement'
  | 'recommendation'
  | 'milestone'
  | 'subscription'
  | 'matching'    // マッチング関連の通知を追加
  | 'message';    // メッセージ関連の通知を追加

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  source_id?: string; // 関連するリソースのID（動画ID、コメントIDなど）
  source_type?: string; // リソースのタイプ（video, commentなど）
  created_at: string;
  updated_at?: string;
  is_read: boolean;
  link?: string; // クリック時のリダイレクト先
  thumbnail_url?: string; // 通知に関連する画像（あれば）
  priority?: 'high' | 'medium' | 'low';
  action_taken?: boolean;
  sender_id?: string;
  notification_group?: string;
  expiration_date?: string;
  display_duration?: number;
  metadata?: NotificationMetadata;
}

export interface NotificationMetadata {
  video_id?: string;
  review_id?: string;
  rating_id?: string;
  user_id?: string;
  achievement_id?: string;
  milestone_id?: string;
  subscription_id?: string;
  recommendation_data?: {
    source: string;
    confidence_score: number;
  };
  matching_data?: {            // マッチング関連のメタデータを追加
    match_id?: string;
    match_score?: number;
    match_type?: 'like' | 'super_like' | 'mutual';
    matched_user_id?: string;
    matched_username?: string;
  };
  message_data?: {             // メッセージ関連のメタデータを追加
    conversation_id?: string;
    sender_id?: string;
    sender_username?: string;
    message_preview?: string;
    is_highlighted?: boolean;
  };
  interaction_history?: {
    last_interaction: string;
    interaction_count: number;
  };
  additional_data?: Record<string, unknown>;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  // 通知タイプ設定
  video_comments: boolean; // 自分の動画へのコメント通知
  review_replies: boolean; // レビューへの返信通知
  likes: boolean; // いいね通知
  follows: boolean; // フォロー通知
  system_notifications: boolean; // システム通知
  new_videos: boolean; // 登録チャンネルの新着動画通知
  ratings: boolean; // 評価通知
  favorites: boolean; // お気に入り通知
  mentions: boolean; // メンション通知
  achievements: boolean; // 実績通知
  recommendations: boolean; // おすすめ通知
  milestones: boolean; // マイルストーン通知
  subscriptions: boolean; // 購読通知
  matching_notifications: boolean; // マッチング通知を追加
  message_notifications: boolean; // メッセージ通知を追加
  
  // 通知方法設定
  email_notifications: boolean; // メール通知を受け取るか
  push_notifications: boolean; // プッシュ通知を受け取るか
  in_app_notifications: boolean; // アプリ内通知を受け取るか
  
  // 高度な設定（オプション）
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_timezone?: string;
  
  max_notifications_per_day?: number;
  batch_notifications?: boolean;
  batch_interval_minutes?: number;
  
  created_at: string;
  updated_at: string;
}

export interface NotificationBatchSettings {
  enabled: boolean;
  max_batch_size: number;
  delivery_interval: number;
  priority_threshold: 'high' | 'medium' | 'low';
}

export interface NotificationChannelConfig {
  email: {
    enabled: boolean;
    template_id?: string;
  };
  push: {
    enabled: boolean;
    platform_settings?: {
      ios?: boolean;
      android?: boolean;
      web?: boolean;
    };
  };
  in_app: {
    enabled: boolean;
    display_duration?: number;
  };
}