// src/utils/pointsUtils.ts
import { supabase } from '../lib/supabase';
import { UserPoints } from '../types/matching';

/**
 * ユーザーのポイント残高を取得する関数
 * @param userId - ユーザーID
 * @returns ポイント情報
 */
export const getPoints = async (userId: string): Promise<UserPoints> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }

    const { data, error } = await supabase
      .from('user_points')
      .select('balance, lifetime_earned, last_updated')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが存在しない場合は新規作成
        const { data: newData, error: insertError } = await supabase
          .from('user_points')
          .insert({
            user_id: userId,
            balance: 10, // 初期ポイント
            lifetime_earned: 10
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        return newData as UserPoints;
      } else {
        throw error;
      }
    }
    
    return data as UserPoints;
    
  } catch (error) {
    console.error('ポイント取得エラー:', error);
    // デフォルト値を返す
    return {
      balance: 0,
      lifetime_earned: 0,
      last_updated: new Date().toISOString()
    };
  }
};

/**
 * ユーザーがポイントを十分持っているか確認する関数
 * @param userId - ユーザーID
 * @param amount - 必要なポイント数
 * @returns 十分なポイントがあるかどうか
 */
export const hasEnoughPoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }
    
    if (amount <= 0) {
      return true; // 0以下のポイントは常に十分ある
    }
    
    const userPoints = await getPoints(userId);
    return userPoints.balance >= amount;
    
  } catch (error) {
    console.error('ポイント確認エラー:', error);
    return false;
  }
};

/**
 * ポイントを消費する関数
 * @param userId - ユーザーID
 * @param amount - 消費ポイント数
 * @param transactionType - トランザクションタイプ
 * @param referenceId - 参照ID（オプション）
 * @returns 成功したかどうか
 */
export const consumePoints = async (
  userId: string,
  amount: number,
  transactionType: string,
  referenceId?: string
): Promise<boolean> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }

    if (amount <= 0) {
      throw new Error('消費ポイント数は0より大きい値を指定してください');
    }

    // ポイント残高を確認
    const userPoints = await getPoints(userId);
    
    if (userPoints.balance < amount) {
      throw new Error('ポイント残高が不足しています');
    }
    
    // トランザクション開始
    const { error } = await supabase.rpc('consume_points', {
      p_user_id: userId,
      p_amount: amount
    });
    
    if (error) throw error;
    
    // トランザクション記録
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount: -amount,
        transaction_type: transactionType,
        reference_id: referenceId,
        description: `${transactionType}のためのポイント消費`
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
 * @param userId - ユーザーID
 * @param amount - 加算ポイント数
 * @param transactionType - トランザクションタイプ
 * @param referenceId - 参照ID（オプション）
 * @param description - 説明（オプション）
 * @returns 成功したかどうか
 */
export const addPoints = async (
  userId: string,
  amount: number,
  transactionType: string,
  referenceId?: string,
  description?: string
): Promise<boolean> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }

    if (amount <= 0) {
      throw new Error('加算ポイント数は0より大きい値を指定してください');
    }
    
    // トランザクション開始
    const { error } = await supabase.rpc('add_points', {
      p_user_id: userId,
      p_amount: amount
    });
    
    if (error) throw error;
    
    // トランザクション記録
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: transactionType,
        reference_id: referenceId,
        description: description || `${transactionType}からのポイント追加`
      });
      
    if (transactionError) throw transactionError;
    
    return true;
    
  } catch (error) {
    console.error('ポイント加算エラー:', error);
    return false;
  }
};