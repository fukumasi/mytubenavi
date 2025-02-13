import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  PromotionStats, 
  PromotionSlot, 
  SlotBooking 
} from '../types/promotion';

export function usePromotion() {
  const [promotionSlots, setPromotionSlots] = useState<PromotionSlot[]>([]);
  const [bookings, setBookings] = useState<SlotBooking[]>([]);
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromotionData = async () => {
      try {
        setLoading(true);
        const [slotsRes, bookingsRes, statsRes] = await Promise.all([
          supabase.from('promotion_slots').select('*'),
          supabase.from('slot_bookings').select('*'),
          supabase.from('promotion_stats').select('*').single()
        ]);

        if (slotsRes.error) throw slotsRes.error;
        if (bookingsRes.error) throw bookingsRes.error;
        if (statsRes.error) throw statsRes.error;

        setPromotionSlots(slotsRes.data || []);
        setBookings(bookingsRes.data || []);
        setStats(statsRes.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '読み込みエラー');
      } finally {
        setLoading(false);
      }
    };

    fetchPromotionData();
  }, []);

  const bookPromotionSlot = async (booking: Omit<SlotBooking, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('slot_bookings')
        .insert(booking)
        .select()
        .single();

      if (error) throw error;
      setBookings(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約エラー');
      return null;
    }
  };

  return {
    promotionSlots,
    bookings,
    stats,
    loading,
    error,
    bookPromotionSlot
  };
}