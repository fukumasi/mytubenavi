// src/types/promotion.ts
import { Video } from './index';

// インデックスファイルからのインポートを一旦やめて直接定義する
export interface PromotionSlot {
  id: string;
  name: string;
  type: 'premium' | 'sidebar' | 'genre' | 'related';
  price: number;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  max_videos?: number;
  max_duration?: number;
  video_id?: string;
  youtube_id?: string;
  video_title?: string;
  thumbnail_url?: string;
  genre_id?: string;    // ジャンルID（ジャンル特定用）
  genres?: string[];    // 複数ジャンルに対応する場合
  image_url?: string;   // 掲載枠のサムネイル画像URL
}

export interface SlotBooking {
  id: string;
  user_id: string;          // ProfileのIDを参照
  youtuber_id: string;      // YouTuberのProfileID
  slot_id: string;          // PromotionSlotのIDを参照
  video_id: string;         // VideoのIDを参照
  start_date: string;
  end_date: string;
  duration: number;         // 期間（日数）
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  amount: number;           // 決済金額
  created_at: string;
  updated_at: string;
  payment_status?: 'pending' | 'processing' | 'succeeded' | 'cancelled' | 'paid' | 'refunded';
  payment_intent_id?: string;  // Stripe決済ID
  slot?: PromotionSlot;     // 関連する掲載枠
  video?: Video;            // 関連する動画
}

// APIから返されるデータ用の拡張インターフェース
export interface SlotBookingWithPayment extends SlotBooking {
  amount_paid?: number; // DB上の支払い金額カラム
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
  // PromotionStatsコンポーネントのために必須プロパティとして追加
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
}

export interface BookingAnalytics {
  id: string;
  booking_id: string;
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  created_at: string;
}

export interface BookingPayment {
  id: string;
  booking_id: string;
  payment_intent_id: string;
  amount: number;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  created_at: string;
}

export interface PromotionPlan {
  id: string;
  name: string;
  type: 'premium' | 'sidebar' | 'genre' | 'related';
  price: number;
  max_duration: number;
  max_videos: number;
  is_active: boolean;
  description?: string;
  features?: string[];
  position?: string;
  visibility?: number;
  discount_percentage?: number;
}

export type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';
export type PromotionSlotType = 'premium' | 'sidebar' | 'genre' | 'related';