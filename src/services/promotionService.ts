// src/services/promotionService.ts
import { supabase } from '@/lib/supabase';
import { PromotionSlot, SlotBooking, BookingAnalytics } from '@/types/promotion';
import { forceDeletePromotionSlot } from '@/utils/promotionSlotUtils';

export const promotionService = {
  // 掲載枠の取得
  async getPromotionSlots(): Promise<PromotionSlot[]> {
    try {
      const { data, error } = await supabase
        .from('promotion_slots')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('掲載枠の取得に失敗しました:', error);
      return [];
    }
  },

  // 特定タイプの掲載枠を取得
  async getPromotionSlotsByType(type: string): Promise<PromotionSlot[]> {
    try {
      const { data, error } = await supabase
        .from('promotion_slots')
        .select('*')
        .eq('type', type)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`${type}タイプの掲載枠取得に失敗しました:`, error);
      return [];
    }
  },

  // 特定ジャンルの掲載枠を取得
  async getPromotionSlotsByGenre(genreId: string): Promise<PromotionSlot[]> {
    try {
      // ジャンルIDが指定されている掲載枠を取得
      const { data, error } = await supabase
        .from('promotion_slots')
        .select('*')
        .eq('genre_id', genreId)
        .eq('is_active', true);

      if (error) throw error;
      
      // genres配列にgenreIdが含まれている掲載枠も取得
      const { data: arrayData, error: arrayError } = await supabase
        .from('promotion_slots')
        .select('*')
        .contains('genres', [genreId])
        .eq('is_active', true);
        
      if (arrayError) throw arrayError;
      
      // 両方のクエリ結果を結合し、重複を削除
      const combined = [...(data || []), ...(arrayData || [])];
      const uniqueSlots = Array.from(new Map(combined.map(slot => [slot.id, slot])).values());
      
      return uniqueSlots;
    } catch (error) {
      console.error(`ジャンル(${genreId})の掲載枠取得に失敗しました:`, error);
      return [];
    }
  },

  // 掲載枠の予約
  async bookSlot(booking: Omit<SlotBooking, 'id'>): Promise<SlotBooking | null> {
    try {
      const { data, error } = await supabase
        .from('slot_bookings')
        .insert(booking)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('掲載枠の予約に失敗しました:', error);
      return null;
    }
  },

  // 予約の更新
  async updateBooking(id: string, updates: Partial<SlotBooking>): Promise<SlotBooking | null> {
    try {
      const { data, error } = await supabase
        .from('slot_bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('予約の更新に失敗しました:', error);
      return null;
    }
  },

  // アクティブな予約を取得
  async getActiveBookings(userId: string): Promise<SlotBooking[]> {
    try {
      const { data, error } = await supabase
        .from('slot_bookings')
        .select(`
          *,
          slot:slot_id(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('アクティブな予約の取得に失敗しました:', error);
      return [];
    }
  },

  // すべてのアクティブな予約を取得し、関連動画データを含める
  async getAllActiveBookings(): Promise<SlotBooking[]> {
    try {
      // 現在の日時を取得して期限切れの予約をフィルタリングするために使用
      const now = new Date().toISOString();
      
      // まずアクティブな予約を取得
      const { data: bookings, error: bookingsError } = await supabase
        .from('slot_bookings')
        .select(`
          *,
          slot:slot_id(*)
        `)
        .eq('status', 'active')
        .gt('end_date', now) // 終了日が現在より後の予約のみを取得
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('予約データの取得エラー:', bookingsError);
        throw bookingsError;
      }
      
      if (!bookings || bookings.length === 0) {
        console.log('現在アクティブな予約はありません');
        return [];
      }
      
      // youtubeIdが存在するか確認
      const bookingsWithValidId = bookings.filter(booking => booking.video_id && booking.video_id.trim() !== '');
      
      if (bookingsWithValidId.length === 0) {
        console.log('有効な動画IDを持つ予約がありません');
        return [];
      }
      
      // 各予約に対して、対応する動画情報を取得
      const bookingsWithVideos = await Promise.all(
        bookingsWithValidId.map(async (booking) => {
          try {
            // video_idを使って動画情報を取得
            const { data: videoData, error: videoError } = await supabase
              .from('videos')
              .select('*')
              .eq('id', booking.video_id)
              .single();
              
            if (videoError) {
              console.warn(`動画ID: ${booking.video_id} の取得に失敗しました:`, videoError);
              return { ...booking, video: null };
            }
            
            if (!videoData) {
              console.warn(`動画ID: ${booking.video_id} に対応する動画データが見つかりません`);
              return { ...booking, video: null };
            }
            
            // 動画情報を予約オブジェクトに追加
            return { ...booking, video: videoData };
          } catch (error) {
            console.error(`予約ID: ${booking.id} の動画データ取得中にエラー発生:`, error);
            return { ...booking, video: null };
          }
        })
      );
      
      // 有効な動画データを持つ予約だけをフィルタリング
      const validBookings = bookingsWithVideos.filter(booking => booking.video !== null);
      console.log(`有効な動画データを持つ予約数: ${validBookings.length}`);
      
      return validBookings;
    } catch (error) {
      console.error('すべてのアクティブな予約の取得に失敗しました:', error);
      return [];
    }
  },

  // 特定タイプのアクティブな予約を取得
  async getActiveBookingsByType(type: string): Promise<SlotBooking[]> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('slot_bookings')
        .select(`
          *,
          slot:slot_id(*),
          video:video_id(*)
        `)
        .eq('status', 'active')
        .gt('end_date', now)
        .eq('slot.type', type);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`${type}タイプのアクティブな予約の取得に失敗しました:`, error);
      return [];
    }
  },

  // 特定ジャンルのアクティブな予約を取得
  async getActiveBookingsByGenre(genreId: string): Promise<SlotBooking[]> {
    try {
      const now = new Date().toISOString();
      
      // ジャンルIDが指定されている予約を取得
      const { data, error } = await supabase
        .from('slot_bookings')
        .select(`
          *,
          slot:slot_id(*),
          video:video_id(*)
        `)
        .eq('status', 'active')
        .gt('end_date', now)
        .eq('slot.genre_id', genreId);

      if (error) throw error;

      // genres配列にgenreIdが含まれている予約も取得
      const { data: arrayData, error: arrayError } = await supabase
        .from('slot_bookings')
        .select(`
          *,
          slot:slot_id(*),
          video:video_id(*)
        `)
        .eq('status', 'active')
        .gt('end_date', now)
        .contains('slot.genres', [genreId]);

      if (arrayError) throw arrayError;

      // 両方のクエリ結果を結合し、重複を削除
      const combined = [...(data || []), ...(arrayData || [])];
      const uniqueBookings = Array.from(new Map(combined.map(booking => [booking.id, booking])).values());

      return uniqueBookings;
    } catch (error) {
      console.error(`ジャンル(${genreId})のアクティブな予約の取得に失敗しました:`, error);
      return [];
    }
  },

  // 予約の分析データを取得
  async getBookingAnalytics(bookingId: string): Promise<BookingAnalytics[]> {
    try {
      const { data, error } = await supabase
        .from('slot_booking_analytics')
        .select('*')
        .eq('booking_id', bookingId)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('予約の分析データ取得に失敗しました:', error);
      return [];
    }
  },

  // インプレッション（表示回数）をカウントアップ
  async incrementImpression(bookingId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 今日の分析データが存在するか確認
      const { data, error } = await supabase
        .from('slot_booking_analytics')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('date', today)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116: 行が見つからない場合のエラー
        throw error;
      }
      
      if (data) {
        // 既存のデータがある場合、インプレッションをインクリメント
        await supabase
          .from('slot_booking_analytics')
          .update({ 
            impressions: data.impressions + 1,
            ctr: (data.clicks / (data.impressions + 1)) * 100
          })
          .eq('id', data.id);
      } else {
        // 新しいデータを作成
        await supabase
          .from('slot_booking_analytics')
          .insert({
            booking_id: bookingId,
            date: today,
            impressions: 1,
            clicks: 0,
            ctr: 0
          });
      }
    } catch (error) {
      console.error('インプレッションのカウントアップに失敗しました:', error);
    }
  },

  // クリック数をカウントアップ
  async incrementClick(bookingId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 今日の分析データが存在するか確認
      const { data, error } = await supabase
        .from('slot_booking_analytics')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('date', today)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116: 行が見つからない場合のエラー
        throw error;
      }
      
      if (data) {
        // 既存のデータがある場合、クリック数をインクリメント
        await supabase
          .from('slot_booking_analytics')
          .update({ 
            clicks: data.clicks + 1,
            ctr: ((data.clicks + 1) / data.impressions) * 100
          })
          .eq('id', data.id);
      } else {
        // 新しいデータを作成 (通常インプレッションの後にクリックするが、念のため)
        await supabase
          .from('slot_booking_analytics')
          .insert({
            booking_id: bookingId,
            date: today,
            impressions: 1,
            clicks: 1,
            ctr: 100
          });
      }
    } catch (error) {
      console.error('クリック数のカウントアップに失敗しました:', error);
    }
  },

  // 掲載枠の削除（強制削除機能を使用）
  async deletePromotionSlot(slotId: string): Promise<boolean> {
    try {
      const result = await forceDeletePromotionSlot(slotId);
      return result.success;
    } catch (error) {
      console.error('掲載枠の削除に失敗しました:', error);
      return false;
    }
  },

  // アクティブな掲載枠の数をカウント
  async countActiveSlots(userId?: string): Promise<number> {
    try {
      let query = supabase
        .from('promotion_slots')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
        
      // ユーザーIDが指定されている場合は、そのユーザーの掲載枠のみカウント
      if (userId) {
        query = query.eq('user_id', userId);
      }
        
      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('掲載枠の数の取得に失敗しました:', error);
      return 0;
    }
  },

  // 掲載枠を作成する関数
  async createPromotionSlot(slotData: Omit<PromotionSlot, 'id'>): Promise<PromotionSlot | null> {
    try {
      // アクティブな掲載枠の数を確認
      const count = await this.countActiveSlots();
      
      // 最大数を超えている場合はエラー
      if (count >= 5) {
        throw new Error('掲載枠の最大数（5）に達しています。新しい掲載枠を作成する前に、既存の掲載枠を削除してください。');
      }
      
      // is_activeをtrueに設定して掲載枠を作成
      const dataWithActive = {
        ...slotData,
        is_active: true
      };
      
      const { data, error } = await supabase
        .from('promotion_slots')
        .insert([dataWithActive])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('掲載枠の作成に失敗しました:', error);
      if (error instanceof Error) {
        throw error; // エラーを呼び出し元に伝播させる
      }
      return null;
    }
  }
};