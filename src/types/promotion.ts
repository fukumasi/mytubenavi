export interface PromotionStats {
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
}

export interface PromotionSlot {
  id: string;
  name: string;
  type: 'premium' | 'sidebar' | 'genre' | 'related';
  price: number;
  maxVideos: number;
  description?: string;
}

export interface SlotBooking {
  id: string;
  userId: string;
  slotId: string;
  videoId: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  totalPrice: number;
}

export type TimeRange = 'week' | 'month' | 'year';