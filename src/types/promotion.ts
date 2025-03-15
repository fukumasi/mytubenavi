// src/types/promotion.ts
import { Video } from './index';
import type { PromotionSlot } from './index';  // 型としてインポート

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
  payment_status?: 'pending' | 'paid' | 'refunded';
  payment_intent_id?: string;  // Stripe決済ID
  slot?: PromotionSlot;     // 関連する掲載枠
  video?: Video;            // 関連する動画
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

export type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';

// 型としてエクスポート
export type { PromotionSlot };