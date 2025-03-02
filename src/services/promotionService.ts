import { supabase } from '@/lib/supabase';
import { PromotionSlot, SlotBooking } from '@/types/promotion';

export const promotionService = {
  async getPromotionSlots(): Promise<PromotionSlot[]> {
    const { data, error } = await supabase
      .from('promotion_slots')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  async bookSlot(booking: Omit<SlotBooking, 'id'>): Promise<SlotBooking | null> {
    const { data, error } = await supabase
      .from('slot_bookings')
      .insert(booking)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getActiveBookings(userId: string): Promise<SlotBooking[]> {
    const { data, error } = await supabase
      .from('slot_bookings')
      .select('*')
      .eq('userId', userId)
      .eq('status', 'active');

    if (error) throw error;
    return data || [];
  }
};