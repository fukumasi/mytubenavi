import { supabase } from '@/lib/supabase';
import { checkTableExists, createTableIfNotExists } from './tableUtils';
import { ConnectionStatus } from '@/types/matching';

/**
 * 接続リクエストを送信する
 */
export const sendConnectionRequest = async (userId: string, targetUserId: string): Promise<boolean> => {
  try {
    if (!userId || !targetUserId) throw new Error('ユーザーIDまたは対象ユーザーIDが不足しています');

    await checkTableExists('connections') || await createTableIfNotExists('connections');

    const { error } = await supabase
      .from('connections')
      .insert({
        user_id: userId,
        connected_user_id: targetUserId,
        status: ConnectionStatus.PENDING,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('接続リクエスト送信エラー:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('sendConnectionRequestエラー:', error);
    return false;
  }
};

/**
 * 接続リクエストに応答する（承認 or 拒否）
 */
export const respondToConnectionRequest = async (connectionId: string, status: ConnectionStatus): Promise<boolean> => {
  try {
    if (!connectionId || !status) throw new Error('接続IDまたはステータスが不足しています');

    await checkTableExists('connections') || await createTableIfNotExists('connections');

    const { error } = await supabase
      .from('connections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', connectionId);

    if (error) {
      console.error('接続リクエスト応答エラー:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('respondToConnectionRequestエラー:', error);
    return false;
  }
};

/**
 * 接続状態を取得する（一覧取得）
 */
export const getConnections = async (userId: string): Promise<any[]> => {
  try {
    if (!userId) throw new Error('ユーザーIDが指定されていません');

    await checkTableExists('connections') || await createTableIfNotExists('connections');

    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`);

    if (error) {
      console.error('接続一覧取得エラー:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('getConnectionsエラー:', error);
    return [];
  }
};
