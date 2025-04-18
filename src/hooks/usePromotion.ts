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
        console.log('usePromotion: データ取得を開始します...');
        
        const [slotsRes, bookingsRes, statsRes] = await Promise.all([
          // アクティブな掲載枠のみを取得するように修正
          supabase.from('promotion_slots').select('*').eq('is_active', true),
          supabase.from('slot_bookings').select('*'),
          supabase.from('promotion_stats').select('*').single()
        ]);

        if (slotsRes.error) throw slotsRes.error;
        if (bookingsRes.error) throw bookingsRes.error;
        // promotion_statsテーブルが存在しない場合のエラーを無視
        if (statsRes.error && !statsRes.error.message.includes('does not exist')) {
          throw statsRes.error;
        }

        console.log('usePromotion: 取得した掲載枠データ:', slotsRes.data);
        console.log('usePromotion: 有効な掲載枠数:', slotsRes.data?.length || 0);
        
        setPromotionSlots(slotsRes.data || []);
        setBookings(bookingsRes.data || []);
        setStats(statsRes.data || null);
      } catch (err) {
        console.error('usePromotion: データ取得エラー:', err);
        setError(err instanceof Error ? err.message : '読み込みエラー');
      } finally {
        setLoading(false);
      }
    };

    fetchPromotionData();

    // リアルタイム更新のサブスクリプション
    const promotionSlotsSubscription = supabase
      .channel('custom-promotion-slots-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'promotion_slots',
          filter: 'is_active=eq.true' // アクティブな掲載枠のみを監視
        }, 
        payload => {
          console.log('usePromotion: 掲載枠更新イベント:', payload);
          fetchPromotionData(); // データを再取得
        }
      )
      .subscribe((status) => {
        console.log('usePromotion: サブスクリプションステータス:', status);
      });

    // クリーンアップ時にサブスクリプションを解除
    return () => {
      console.log('usePromotion: サブスクリプションを解除します');
      promotionSlotsSubscription.unsubscribe();
    };
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

  // 掲載枠データを再取得するための関数を追加
  const refreshPromotionData = async () => {
    try {
      setLoading(true);
      console.log('usePromotion: データを再取得します...');
      
      const { data, error } = await supabase
        .from('promotion_slots')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      
      console.log('usePromotion: 再取得した掲載枠データ:', data);
      console.log('usePromotion: 有効な掲載枠数:', data?.length || 0);
      
      setPromotionSlots(data || []);
      return data;
    } catch (err) {
      console.error('usePromotion: データ再取得エラー:', err);
      setError(err instanceof Error ? err.message : '更新エラー');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    promotionSlots,
    bookings,
    stats,
    loading,
    error,
    bookPromotionSlot,
    refreshPromotionData // 追加した関数をエクスポート
  };
}