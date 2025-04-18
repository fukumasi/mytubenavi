// src/hooks/useMessaging.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import messagingService from '@/services/messagingService';
import { Message, ConversationWithProfile } from '@/types/matching';
import usePoints from '@/hooks/usePoints';
import verificationService, { VerificationLevel } from '@/services/verificationService';

/**
 * メッセージング機能を扱うためのカスタムフック
 */
export const useMessaging = () => {
  const { user, isPremium } = useAuth();
  const { consumePoints, hasEnoughPoints } = usePoints();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationState, setVerificationState] = useState<{
    level: VerificationLevel;
    loading: boolean;
  }>({
    level: VerificationLevel.EMAIL_ONLY,
    loading: true
  });
  
  // useRefを使用してサブスクリプションを管理
  const conversationSubscriptionRef = useRef<(() => void) | null>(null);
  const messageSubscriptionRef = useRef<(() => void) | null>(null);
  
  // 購読状態を追跡するフラグ
  const isConversationSubscribedRef = useRef<boolean>(false);
  const isMessageSubscribedRef = useRef<boolean>(false);

  // 認証レベルを取得
  useEffect(() => {
    const fetchVerificationLevel = async () => {
      if (!user) return;
      
      try {
        const state = await verificationService.getVerificationState();
        setVerificationState({
          level: state?.verificationLevel || VerificationLevel.EMAIL_ONLY,
          loading: false
        });
      } catch (err) {
        console.error('認証レベル取得エラー:', err);
        setVerificationState({
          level: VerificationLevel.EMAIL_ONLY,
          loading: false
        });
      }
    };

    fetchVerificationLevel();
  }, [user]);

  // 会話一覧を取得
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('会話一覧を取得します');
      const conversationsData = await messagingService.getConversations(user.id);
      
      // 前の状態と異なる場合のみ更新
      setConversations(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(conversationsData)) {
          return conversationsData;
        }
        return prev;
      });
      
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
    if (!user || !conversationId) return;
    
    try {
      setLoading(true);
      console.log(`会話ID: ${conversationId} のメッセージを取得します`);
      const messagesData = await messagingService.getMessages(conversationId);
      
      // 古い順に表示するためreverse
      const sortedMessages = [...messagesData].reverse();
      
      // 前の状態と異なる場合のみ更新
      setMessages(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(sortedMessages)) {
          return sortedMessages;
        }
        return prev;
      });
      
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
    
    // 認証レベルチェック
    if (verificationState.level < VerificationLevel.PHONE_VERIFIED) {
      setError('メッセージの送受信には電話番号認証が必要です');
      return null;
    }
    
    try {
      console.log(`ユーザーID: ${otherUserId} との会話を作成します`);
      const conversation = await messagingService.createConversation(user.id, otherUserId);
      
      // 会話一覧を更新（副作用を避けるため、戻り値を使用）
      await fetchConversations();
      return conversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('会話の作成に失敗しました');
      return null;
    }
  }, [user, fetchConversations, verificationState.level]);

  // メッセージを送信
  const sendMessage = useCallback(async (
    receiverId: string, 
    conversationId: string, 
    content: string, 
    isHighlighted = false
  ) => {
    if (!user) return false;
    
    // 認証レベルチェック
    if (verificationState.level < VerificationLevel.PHONE_VERIFIED) {
      setError('メッセージの送受信には電話番号認証が必要です');
      return false;
    }
    
    // プレミアム会員はポイントチェックをスキップ
    if (!isPremium) {
      // ポイントチェック（ハイライトは10ポイント、通常は1ポイント）
      const pointCost = isHighlighted ? 10 : 1;
      
      if (!await hasEnoughPoints(pointCost)) {
        setError(`ポイントが足りません（必要: ${pointCost}ポイント）`);
        return false;
      }
    }
    
    try {
      console.log(`会話ID: ${conversationId} にメッセージを送信します`);
      // メッセージ送信
      await messagingService.sendMessage(
        user.id,
        receiverId,
        conversationId,
        content,
        isHighlighted
      );
      
      // プレミアム会員でない場合のみポイント消費
      if (!isPremium) {
        const pointCost = isHighlighted ? 10 : 1;
        await consumePoints(
          pointCost, 
          'message', 
          conversationId, 
          isHighlighted ? 'ハイライトメッセージ送信' : 'メッセージ送信'
        );
      }
      
      // 最新のメッセージを取得して表示に反映（リアルタイム購読していない場合のみ）
      if (currentConversation === conversationId && !isMessageSubscribedRef.current) {
        await fetchMessages(conversationId);
      }
      
      // 会話一覧を更新（リアルタイム購読していない場合のみ）
      if (!isConversationSubscribedRef.current) {
        await fetchConversations();
      }
      
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('メッセージの送信に失敗しました');
      return false;
    }
  }, [
    user, 
    currentConversation, 
    fetchMessages, 
    fetchConversations, 
    hasEnoughPoints, 
    consumePoints, 
    isPremium,
    verificationState.level
  ]);

  // 会話を削除
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return false;
    
    try {
      console.log(`会話ID: ${conversationId} を削除します`);
      await messagingService.deleteConversation(conversationId);
      
      // 現在表示中の会話が削除された場合は初期化
      if (currentConversation === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      // 会話一覧を更新
      await fetchConversations();
      
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
      console.log('初回マウント時に会話一覧を取得します');
      fetchConversations();
    }
    
    return () => {
      console.log('useMessaging フックのクリーンアップを実行します');
    };
  }, [user, fetchConversations]);

  // リアルタイムメッセージ購読
  useEffect(() => {
    if (!user || !currentConversation) return;
    
    // 既に購読中なら新たに購読しない
    if (isMessageSubscribedRef.current && messageSubscriptionRef.current) {
      console.log(`会話ID: ${currentConversation} は既に購読中です`);
      return;
    }
    
    console.log(`会話ID: ${currentConversation} のメッセージを購読します`);
    
    // 前の購読をクリーンアップ
    if (messageSubscriptionRef.current) {
      console.log('前のメッセージ購読をクリーンアップします');
      messageSubscriptionRef.current();
      messageSubscriptionRef.current = null;
    }
    
    // 現在の会話のメッセージをリアルタイムで購読
    const unsubscribe = messagingService.subscribeToMessages(
      currentConversation,
      (newMessage) => {
        // 自分宛てのメッセージが来たら既読にする
        if (newMessage.receiver_id === user.id) {
          messagingService.markMessagesAsRead(currentConversation, user.id);
        }
        
        // メッセージ一覧に追加（重複を避ける）
        setMessages(prevMessages => {
          const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            return prevMessages;
          }
          return [...prevMessages, newMessage];
        });
      }
    );
    
    // 購読参照を更新
    messageSubscriptionRef.current = unsubscribe;
    isMessageSubscribedRef.current = true;
    
    return () => {
      console.log(`会話ID: ${currentConversation} のメッセージ購読を解除します`);
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current();
        messageSubscriptionRef.current = null;
      }
      isMessageSubscribedRef.current = false;
    };
  }, [user, currentConversation]);

  // 会話一覧のリアルタイム更新
  useEffect(() => {
    if (!user) return;
    
    // 既に購読中なら新たに購読しない
    if (isConversationSubscribedRef.current && conversationSubscriptionRef.current) {
      console.log('会話一覧は既に購読中です');
      return;
    }
    
    console.log('会話一覧を購読します');
    
    // 前の購読をクリーンアップ
    if (conversationSubscriptionRef.current) {
      console.log('前の会話一覧購読をクリーンアップします');
      conversationSubscriptionRef.current();
      conversationSubscriptionRef.current = null;
    }
    
    // 会話一覧をリアルタイムで購読
    const unsubscribe = messagingService.subscribeToConversations(
      user.id,
      // 会話に変更があった場合は一覧を再取得
      () => {
        console.log('会話一覧に変更がありました');
        fetchConversations();
      }
    );
    
    // 購読参照を更新
    conversationSubscriptionRef.current = unsubscribe;
    isConversationSubscribedRef.current = true;
    
    return () => {
      console.log('会話一覧の購読を解除します');
      if (conversationSubscriptionRef.current) {
        conversationSubscriptionRef.current();
        conversationSubscriptionRef.current = null;
      }
      isConversationSubscribedRef.current = false;
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    messages,
    currentConversation,
    loading,
    error,
    verificationState,
    fetchConversations,
    fetchMessages,
    createConversation,
    sendMessage,
    deleteConversation,
    setCurrentConversation
  };
};

export default useMessaging;