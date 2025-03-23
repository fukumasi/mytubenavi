// src/hooks/useMessaging.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import messagingService from '../services/messagingService';
import { Message, ConversationWithProfile } from '../types/matching';
import usePoints from './usePoints';

/**
 * メッセージング機能を扱うためのカスタムフック
 */
export const useMessaging = () => {
  const { user } = useAuth();
  const { consumePoints, hasEnoughPoints } = usePoints();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 会話一覧を取得
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const conversationsData = await messagingService.getConversations(user.id);
      setConversations(conversationsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('会話の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 特定の会話のメッセージを取得
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const messagesData = await messagingService.getMessages(conversationId);
      setMessages(messagesData.reverse()); // 古い順に表示するためreverse
      setCurrentConversation(conversationId);
      setError(null);
      
      // メッセージを既読にする
      await messagingService.markMessagesAsRead(conversationId, user.id);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('メッセージの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 会話を作成
  const createConversation = useCallback(async (otherUserId: string) => {
    if (!user) return null;
    
    try {
      const conversation = await messagingService.createConversation(user.id, otherUserId);
      await fetchConversations(); // 会話一覧を更新
      return conversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('会話の作成に失敗しました');
      return null;
    }
  }, [user, fetchConversations]);

  // メッセージを送信
  const sendMessage = useCallback(async (
    receiverId: string, 
    conversationId: string, 
    content: string, 
    isHighlighted = false
  ) => {
    if (!user) return false;
    
    // ポイントチェック
    const pointCost = isHighlighted ? 10 : 1; // ハイライトは10ポイント、通常は1ポイント
    
    if (!await hasEnoughPoints(pointCost)) {
      setError('ポイントが足りません');
      return false;
    }
    
    try {
      // メッセージ送信
      await messagingService.sendMessage(
        user.id,
        receiverId,
        conversationId,
        content,
        isHighlighted
      );
      
      // ポイント消費
      await consumePoints(pointCost, 'message', conversationId, 
        isHighlighted ? 'ハイライトメッセージ送信' : 'メッセージ送信');
      
      // 最新のメッセージを取得して表示に反映
      if (currentConversation === conversationId) {
        fetchMessages(conversationId);
      }
      
      // 会話一覧を更新（最終メッセージ時間などが変わるため）
      fetchConversations();
      
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('メッセージの送信に失敗しました');
      return false;
    }
  }, [user, currentConversation, fetchMessages, fetchConversations, hasEnoughPoints, consumePoints]);

  // 会話を削除
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return false;
    
    try {
      await messagingService.deleteConversation(conversationId);
      
      // 現在表示中の会話が削除された場合は初期化
      if (currentConversation === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      // 会話一覧を更新
      fetchConversations();
      
      return true;
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('会話の削除に失敗しました');
      return false;
    }
  }, [user, currentConversation, fetchConversations]);

  // 初回マウント時に会話一覧を取得
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // リアルタイムメッセージ購読
  useEffect(() => {
    if (!user || !currentConversation) return;
    
    // 現在の会話のメッセージをリアルタイムで購読
    const unsubscribe = messagingService.subscribeToMessages(
      currentConversation,
      (newMessage) => {
        // 自分宛てのメッセージが来たら既読にする
        if (newMessage.receiver_id === user.id) {
          messagingService.markMessagesAsRead(currentConversation, user.id);
        }
        
        // メッセージ一覧に追加
        setMessages(prevMessages => [...prevMessages, newMessage]);
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [user, currentConversation]);

  // 会話一覧のリアルタイム更新
  useEffect(() => {
    if (!user) return;
    
    // 会話一覧をリアルタイムで購読
    const unsubscribe = messagingService.subscribeToConversations(
      user.id,
      // 会話に変更があった場合は一覧を再取得
      fetchConversations
    );
    
    return () => {
      unsubscribe();
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    messages,
    currentConversation,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    createConversation,
    sendMessage,
    deleteConversation,
    setCurrentConversation
  };
};

export default useMessaging;