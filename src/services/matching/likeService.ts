import { supabase } from '@/lib/supabase';
import { checkTableExists, createTableIfNotExists } from '@/services/matching/tableUtils';
import { SendLikeResult } from '@/types/matching';
import { consumePoints, hasEnoughPoints, needsPointConsumption, addPoints } from '@/utils/pointsUtils';
import { notificationService } from '@/services/notificationService';

/**
 * いいねを送信する関数
 * @param userId - 送信ユーザーID
 * @param targetUserId - 対象ユーザーID
 * @param isPremium - プレミアム会員か
 * @returns 処理結果
 */
export const sendLike = async (
  userId: string,
  targetUserId: string,
  isPremium: boolean
): Promise<SendLikeResult> => {
  try {
    if (!userId || !targetUserId) {
      return { success: false, isMatch: false, error: 'IDが指定されていません' };
    }

    if (userId === targetUserId) {
      return { success: false, isMatch: false, error: '自分にはいいねできません' };
    }

    await Promise.all([
      checkTableExists('user_likes').then(exists => !exists && createTableIfNotExists('user_likes')),
      checkTableExists('user_matches').then(exists => !exists && createTableIfNotExists('user_matches')),
      checkTableExists('conversations').then(exists => !exists && createTableIfNotExists('conversations')),
    ]);

    // 既にいいね済みチェック
    const { data: existingLike } = await supabase
      .from('user_likes')
      .select('user_id, liked_user_id')
      .eq('user_id', userId)
      .eq('liked_user_id', targetUserId)
      .maybeSingle();

    if (existingLike) {
      return { success: true, isMatch: false, error: 'すでにいいね済みです' };
    }

    // ポイント消費が必要か判定
    if (needsPointConsumption(isPremium)) {
      if (!await hasEnoughPoints(userId, 5)) {
        return { success: false, isMatch: false, error: 'ポイント不足' };
      }
    }

    // いいねを記録
    await supabase.from('user_likes').insert({
      user_id: userId,
      liked_user_id: targetUserId,
      created_at: new Date().toISOString()
    });

    // ポイント消費
    if (needsPointConsumption(isPremium)) {
      const consumed = await consumePoints(userId, 5, 'like', targetUserId);
      if (!consumed) {
        // 失敗時ロールバック
        await supabase.from('user_likes')
          .delete()
          .eq('user_id', userId)
          .eq('liked_user_id', targetUserId);
        return { success: false, isMatch: false, error: 'ポイント消費失敗' };
      }
    }

    // 相手からもいいねされているかチェック
    const { data: matched } = await supabase
      .from('user_likes')
      .select('user_id, liked_user_id')
      .eq('user_id', targetUserId)
      .eq('liked_user_id', userId)
      .maybeSingle();

    if (matched) {
      // マッチング成立
      await supabase.from('user_matches').insert({
        user1_id: userId,
        user2_id: targetUserId,
        created_at: new Date().toISOString()
      });

      // 通知送信
      await notificationService.createMatchingNotification(targetUserId, userId, 90, 'match');
      await notificationService.createMatchingNotification(userId, targetUserId, 90, 'match');

      // ボーナスポイント
      await addPoints(userId, 2, 'match_bonus', targetUserId);
      await addPoints(targetUserId, 2, 'match_bonus', userId);

      return { success: true, isMatch: true };
    } else {
      // まだマッチしていない場合の通知
      await notificationService.createMatchingNotification(targetUserId, userId, 75, 'like');
      return { success: true, isMatch: false };
    }

  } catch (error) {
    console.error('sendLikeエラー:', error);
    return { success: false, isMatch: false, error: 'いいね送信エラー' };
  }
};
