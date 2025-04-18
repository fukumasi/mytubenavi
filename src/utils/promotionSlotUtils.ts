// src/utils/promotionSlotUtils.ts

import { supabase } from '../lib/supabase';

/**
 * 掲載枠の完全削除を行うユーティリティ関数
 * 関連する全てのデータを削除し、エラーハンドリングを強化
 */
export async function forceDeletePromotionSlot(slotId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`掲載枠 ${slotId} の強制削除を開始します...`);
    
    // 1. まず掲載枠の存在確認
    const { data: slotData, error: slotError } = await supabase
      .from('promotion_slots')
      .select('*')
      .eq('id', slotId)
      .single();
    
    if (slotError) {
      console.error('掲載枠の存在確認エラー:', slotError);
      return { success: false, message: `掲載枠の存在確認に失敗しました: ${slotError.message}` };
    }
    
    if (!slotData) {
      return { success: false, message: '指定された掲載枠が見つかりませんでした' };
    }
    
    console.log('削除対象の掲載枠情報:', slotData);
    
    // 2. 関連する予約を取得
    const { data: bookings, error: bookingsError } = await supabase
      .from('slot_bookings')
      .select('id')
      .eq('slot_id', slotId);
    
    if (bookingsError) {
      console.error('関連予約の取得エラー:', bookingsError);
      return { success: false, message: `関連予約の取得に失敗しました: ${bookingsError.message}` };
    }
    
    const bookingIds = bookings?.map(b => b.id) || [];
    console.log(`関連する予約数: ${bookingIds.length}`, bookingIds);
    
    // 3. 関連する分析データを削除
    if (bookingIds.length > 0) {
      const { error: analyticsError } = await supabase
        .from('slot_booking_analytics')
        .delete()
        .in('booking_id', bookingIds);
      
      if (analyticsError) {
        console.error('分析データ削除エラー:', analyticsError);
        return { success: false, message: `分析データの削除に失敗しました: ${analyticsError.message}` };
      }
      
      console.log('関連する分析データを削除しました');
    }
    
    // 4. 関連する予約を削除
    if (bookingIds.length > 0) {
      const { error: deleteBookingsError } = await supabase
        .from('slot_bookings')
        .delete()
        .eq('slot_id', slotId);
      
      if (deleteBookingsError) {
        console.error('予約削除エラー:', deleteBookingsError);
        return { success: false, message: `予約の削除に失敗しました: ${deleteBookingsError.message}` };
      }
      
      console.log('関連する予約を削除しました');
    }
    
    // 5. 掲載枠自体を削除
    const { error: deleteSlotError } = await supabase
      .from('promotion_slots')
      .delete()
      .eq('id', slotId);
    
    if (deleteSlotError) {
      console.error('掲載枠削除エラー:', deleteSlotError);
      
      // 5-1. 削除に失敗した場合、is_activeをfalseに設定
      console.log('is_activeをfalseに設定します...');
      const { error: updateError } = await supabase
        .from('promotion_slots')
        .update({ is_active: false })
        .eq('id', slotId);
      
      if (updateError) {
        console.error('is_active更新エラー:', updateError);
        return { success: false, message: `掲載枠の削除とis_active更新の両方に失敗しました` };
      }
      
      return { success: true, message: `掲載枠の削除に失敗しましたが、is_activeをfalseに設定しました` };
    }
    
    // 6. 削除後の確認
    const { data: checkSlot, error: checkError } = await supabase
      .from('promotion_slots')
      .select('*')
      .eq('id', slotId);
    
    if (checkError) {
      console.error('削除確認エラー:', checkError);
    } else if (checkSlot && checkSlot.length > 0) {
      console.error('掲載枠が削除されていません:', checkSlot);
      return { success: false, message: '削除処理は実行されましたが、掲載枠が依然として存在しています' };
    }
    
    console.log('掲載枠の削除が完了しました');
    return { success: true, message: '掲載枠とその関連データをすべて削除しました' };
    
  } catch (error) {
    console.error('掲載枠の削除処理中に予期しないエラーが発生しました:', error);
    if (error instanceof Error) {
      return { success: false, message: `エラー: ${error.message}` };
    }
    return { success: false, message: '不明なエラーが発生しました' };
  }
}