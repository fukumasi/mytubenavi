// src/services/messagingService.ts

import { supabase } from '@/lib/supabase';
import { Message, Conversation, ConversationWithProfile, ConnectionStatus } from '@/types/matching';

/**
 * メッセージングサービス
 * マッチングした相手とのメッセージ交換に関する機能を提供
 */
export const messagingService = {
  /**
   * 会話一覧を取得する
   * @param userId 現在のユーザーID
   * @returns 会話一覧（相手のプロフィール情報と最新メッセージを含む）
   */
  async getConversations(userId: string): Promise<ConversationWithProfile[]> {
    // user1_id または user2_id が現在のユーザーである会話を取得
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id, 
        user1_id, 
        user2_id, 
        last_message_time, 
        is_active, 
        user1_unread_count, 
        user2_unread_count
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('is_active', true)
      .order('last_message_time', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      throw new Error('会話の取得に失敗しました');
    }

    // 会話ごとに相手のプロフィール情報と最新メッセージを取得
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conversation) => {
        // 相手のユーザーIDを特定
        const otherUserId = conversation.user1_id === userId 
          ? conversation.user2_id 
          : conversation.user1_id;

        // 相手のプロフィール情報を取得
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_premium')
          .eq('id', otherUserId)
          .single();

        // 最新のメッセージを取得
        const { data: latestMessage } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, is_read')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // 未読メッセージ数を計算
        const unreadCount = userId === conversation.user1_id
          ? conversation.user1_unread_count
          : conversation.user2_unread_count;

        return {
          ...conversation,
          otherUser: profileData || { 
            id: otherUserId, 
            username: 'Unknown User', 
            avatar_url: null 
          },
          last_message: latestMessage || null,
          unread_count: unreadCount || 0
        };
      })
    );

    return conversationsWithDetails;
  },

  /**
   * 特定の会話のメッセージ履歴を取得する
   * @param conversationId 会話ID
   * @param limit 取得するメッセージ数
   * @param offset オフセット（ページネーション用）
   * @returns メッセージ履歴
   */
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error('メッセージの取得に失敗しました');
    }

    return data || [];
  },

  /**
   * 新しい会話を作成する
   * @param user1Id 一人目のユーザーID
   * @param user2Id 二人目のユーザーID
   * @returns 作成された会話情報
   */
  async createConversation(user1Id: string, user2Id: string): Promise<Conversation> {
    // 既存の会話をチェック
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .maybeSingle();

    if (existingConversation) {
      // 非アクティブだった場合はアクティブに更新
      if (!existingConversation.is_active) {
        const { data, error } = await supabase
          .from('conversations')
          .update({ is_active: true })
          .eq('id', existingConversation.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating conversation:', error);
          throw new Error('会話の更新に失敗しました');
        }

        return data;
      }
      
      return existingConversation;
    }

    // 新規会話を作成
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        last_message_time: new Date().toISOString(),
        is_active: true,
        user1_unread_count: 0,
        user2_unread_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      throw new Error('会話の作成に失敗しました');
    }

    return data;
  },

  /**
   * メッセージを送信する
   * @param senderId 送信者ID
   * @param receiverId 受信者ID
   * @param conversationId 会話ID
   * @param content メッセージ内容
   * @param isHighlighted ハイライトメッセージかどうか
   * @returns 送信されたメッセージ情報
   */
  async sendMessage(
    senderId: string, 
    receiverId: string, 
    conversationId: string, 
    content: string,
    isHighlighted = false
  ): Promise<Message> {
    // メッセージを送信
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        conversation_id: conversationId,
        content,
        is_highlighted: isHighlighted,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw new Error('メッセージの送信に失敗しました');
    }

    // 会話情報を更新 (最終メッセージ時間と未読カウント)
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user1_id, user2_id, user1_unread_count, user2_unread_count')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      // 受信者の未読カウントを増やす
      const updateData: any = {
        last_message_time: new Date().toISOString()
      };

      if (receiverId === conversation.user1_id) {
        updateData.user1_unread_count = (conversation.user1_unread_count || 0) + 1;
      } else {
        updateData.user2_unread_count = (conversation.user2_unread_count || 0) + 1;
      }

      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);
    }

    return message;
  },

  /**
   * メッセージを既読にする
   * @param conversationId 会話ID
   * @param userId 現在のユーザーID
   * @returns 更新結果
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    // 相手から受け取ったメッセージを既読にする
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    // 会話の未読カウントをリセット
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      const updateData: any = {};
      
      if (userId === conversation.user1_id) {
        updateData.user1_unread_count = 0;
      } else if (userId === conversation.user2_id) {
        updateData.user2_unread_count = 0;
      }

      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);
    }
  },

  /**
   * 会話を削除（非アクティブ化）する
   * @param conversationId 会話ID
   * @returns 更新結果
   */
  async deleteConversation(conversationId: string): Promise<void> {
    // 会話を非アクティブにする（物理削除ではなく論理削除）
    const { error } = await supabase
      .from('conversations')
      .update({ is_active: false })
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('会話の削除に失敗しました');
    }
  },

  /**
   * リアルタイムでメッセージを購読する
   * @param conversationId 会話ID
   * @param callback 新しいメッセージを受け取るコールバック
   * @returns サブスクリプション解除関数
   */
  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();

    // サブスクリプション解除関数を返す
    return () => {
      supabase.removeChannel(subscription);
    };
  },

  /**
   * リアルタイムで会話一覧を購読する
   * @param userId ユーザーID
   * @param callback 会話更新を受け取るコールバック
   * @returns サブスクリプション解除関数
   */
  subscribeToConversations(userId: string, callback: () => void) {
    const subscription = supabase
      .channel(`user_conversations:${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations',
          filter: `or(user1_id=eq.${userId},user2_id=eq.${userId})`
        },
        () => {
          callback();
        }
      )
      .subscribe();

    // サブスクリプション解除関数を返す
    return () => {
      supabase.removeChannel(subscription);
    };
  }
};

/**
 * ユーザー間の接続リクエストを送信する関数
 * @param userId - リクエスト送信者のユーザーID
 * @param targetUserId - リクエスト受信者のユーザーID
 * @returns 処理結果
 */
export const connectUsers = async (
  userId: string,
  targetUserId: string
): Promise<{ success: boolean; status: ConnectionStatus; error?: string }> => {
  try {
    if (!userId || !targetUserId) {
      throw new Error('ユーザーIDまたは対象ユーザーIDが指定されていません');
    }

    if (userId === targetUserId) {
      throw new Error('自分自身に接続リクエストを送ることはできません');
    }

    console.log(`接続リクエスト: ${userId} -> ${targetUserId}`);

    // 既存の接続を確認
    const { data: existingConnection, error: checkError } = await supabase
      .from('connections')
      .select('id, status')
      .or(`and(user_id.eq.${userId},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${userId})`)
      .maybeSingle();
    
    if (checkError) {
      console.error('接続確認エラー:', checkError);
      throw checkError;
    }
    
    // 既に接続リクエストが存在する場合は処理をスキップ
    if (existingConnection) {
      console.log('既存の接続が見つかりました:', existingConnection);
      return {
        success: true,
        status: existingConnection.status as ConnectionStatus
      };
    }
    
    // 新しい接続を作成
    const { error: connectionError } = await supabase
      .from('connections')
      .insert({
        user_id: userId,
        connected_user_id: targetUserId,
        status: ConnectionStatus.PENDING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (connectionError) {
      // 挿入時のエラーをログ出力
      console.error('接続作成エラー:', connectionError);
      throw connectionError;
    }
    
    console.log('接続が正常に作成されました');
    
    // 相手ユーザーに通知を送信
    try {
      console.log(`通知送信: ユーザー${targetUserId}へ、送信者${userId}からの接続リクエスト`);
      const { data: senderData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      const senderName = senderData?.username || 'ユーザー';

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId, // 対象ユーザーのID
          type: 'connection_request',
          title: '新しい接続リクエスト',
          message: `${senderName}さんから接続リクエストが届きました。`,
          is_read: false,
          created_at: new Date().toISOString(),
          priority: 'medium',
          sender_id: userId, // 送信者のID
          notification_group: 'matching'
        });
      
      if (notificationError) {
        console.error('通知作成エラー:', notificationError);
        // 通知のエラーは処理を続行
      } else {
        console.log('通知送信成功');
      }
    } catch (notifyError) {
      console.error('通知送信中のエラー:', notifyError);
      // 通知エラーは処理続行
    }
    
    return {
      success: true,
      status: ConnectionStatus.PENDING
    };
    
  } catch (error) {
    console.error('接続リクエスト送信エラー:', error);
    return {
      success: false,
      status: ConnectionStatus.NONE,
      error: error instanceof Error ? error.message : '接続リクエストの送信に失敗しました'
    };
  }
};

export default messagingService;