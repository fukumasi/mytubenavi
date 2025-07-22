import { supabase } from '@/lib/supabase';
import { checkTableExists, createTableIfNotExists } from './tableUtils';
import { Message } from '@/types/matching';

/**
 * メッセージを取得する
 */
export const getMessages = async (conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> => {
  try {
    if (!conversationId) throw new Error('会話IDが指定されていません');

    await checkTableExists('messages') || await createTableIfNotExists('messages');

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('メッセージ取得エラー:', error);
      return [];
    }

    return (data as Message[] | null) || [];
  } catch (error) {
    console.error('getMessagesエラー:', error);
    return [];
  }
};

/**
 * メッセージを送信する
 */
export const sendMessage = async (
  userId: string,
  receiverId: string,
  conversationId: string,
  content: string,
  isHighlighted: boolean = false
): Promise<{ success: boolean; message?: Message; error?: string }> => {
  try {
    if (!userId || !receiverId || !conversationId) {
      throw new Error('必須パラメータが不足しています');
    }
    if (!content.trim()) {
      return { success: false, error: 'メッセージが空です' };
    }

    await checkTableExists('messages') || await createTableIfNotExists('messages');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        conversation_id: conversationId,
        content,
        is_highlighted: isHighlighted,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (error || !data || data.length === 0) {
      console.error('メッセージ挿入エラー:', error);
      return { success: false, error: 'メッセージ送信に失敗しました' };
    }

    return { success: true, message: data[0] as Message };
  } catch (error) {
    console.error('sendMessageエラー:', error);
    return { success: false, error: 'メッセージ送信エラー' };
  }
};

/**
 * メッセージを既読にする
 */
export const markMessagesAsRead = async (conversationId: string, userId: string): Promise<boolean> => {
  try {
    if (!conversationId || !userId) {
      throw new Error('必須パラメータが不足しています');
    }

    await checkTableExists('messages') || await createTableIfNotExists('messages');

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('既読更新エラー:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('markMessagesAsReadエラー:', error);
    return false;
  }
};
