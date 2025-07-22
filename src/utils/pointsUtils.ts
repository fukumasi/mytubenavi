// src/utils/pointsUtils.ts
import { supabase } from '@/lib/supabase';
import { UserPoints } from '@/types/matching';

/**
 * ユーザーのポイント残高を取得する関数
 */
export const getPoints = async (userId: string): Promise<UserPoints> => {
  try {
    if (!userId) throw new Error('ユーザーIDが指定されていません');

    const { data, error } = await supabase
      .from('user_points')
      .select('balance, lifetime_earned, last_updated')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: newData, error: insertError } = await supabase
        .from('user_points')
        .insert({ user_id: userId, balance: 10, lifetime_earned: 10 })
        .select('balance, lifetime_earned, last_updated')
        .single();
      if (insertError) throw insertError;
      return newData as UserPoints;
    }

    return data as UserPoints;

  } catch (error) {
    console.error('ポイント取得エラー:', error);
    return {
      balance: 0,
      lifetime_earned: 0,
      last_updated: new Date().toISOString(),
    };
  }
};

/**
 * ユーザーが十分なポイントを持っているか確認する関数
 */
export const hasEnoughPoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    if (!userId) throw new Error('ユーザーIDが指定されていません');
    if (amount <= 0) return true;

    const userPoints = await getPoints(userId);
    return userPoints.balance >= amount;
  } catch (error) {
    console.error('ポイント確認エラー:', error);
    return false;
  }
};

/**
 * ポイントを消費する関数
 */
export const consumePoints = async (
  userId: string,
  amount: number,
  transactionType: string,
  referenceId?: string
): Promise<boolean> => {
  try {
    if (!userId) throw new Error('ユーザーIDが指定されていません');
    if (amount <= 0) throw new Error('消費ポイント数は0より大きい必要があります');

    const userPoints = await getPoints(userId);
    if (userPoints.balance < amount) throw new Error('ポイント残高が不足しています');

    const { error } = await supabase.rpc('consume_points', {
      p_user_id: userId,
      p_amount: amount,
    });
    if (error) throw error;

    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount: -amount,
        transaction_type: transactionType,
        reference_id: referenceId,
        description: `${transactionType}によるポイント消費`
      });
    if (transactionError) throw transactionError;

    return true;
  } catch (error) {
    console.error('ポイント消費エラー:', error);
    return false;
  }
};

/**
 * ポイントを加算する関数
 */
export const addPoints = async (
  userId: string,
  amount: number,
  transactionType: string,
  referenceId?: string,
  description?: string
): Promise<boolean> => {
  try {
    if (!userId) throw new Error('ユーザーIDが指定されていません');
    if (amount <= 0) throw new Error('加算ポイント数は0より大きい必要があります');

    const { error } = await supabase.rpc('add_points', {
      p_user_id: userId,
      p_amount: amount,
    });
    if (error) throw error;

    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: transactionType,
        reference_id: referenceId,
        description: description || `${transactionType}によるポイント追加`
      });
    if (transactionError) throw transactionError;

    return true;
  } catch (error) {
    console.error('ポイント加算エラー:', error);
    return false;
  }
};

/**
 * プレミアム会員かどうかに応じてポイント消費が必要かを判定
 */
export const needsPointConsumption = (isPremium: boolean): boolean => {
  return !isPremium; // プレミアムなら無料、通常ならポイント消費
};
