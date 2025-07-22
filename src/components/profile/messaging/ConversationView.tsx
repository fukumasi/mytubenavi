// src/components/messaging/ConversationView.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Message, Conversation, MessageAttachment } from '@/types/matching';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Send, Clock, Crown, Lock, Image as ImageIcon, XCircle, PaperclipIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useMatching from '@/services/matching/useMatching';


import { consumePoints, addPoints } from '@/utils/pointsUtils';
import { Link } from 'react-router-dom';

// 簡単な絵文字セレクターコンポーネント
const EmojiSelector = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
  const commonEmojis = ['😊', '👍', '❤️', '😂', '🙏', '😎', '🎉', '👋', '🔥', '✨'];

  return (
    <div className="bg-white dark:bg-dark-surface rounded-md shadow-lg p-2 border dark:border-dark-border">
      <div className="flex flex-wrap gap-2">
        {commonEmojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded"
            type="button"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

interface ConversationViewProps {
  conversationId?: string;
  otherUserId?: string;
  onNewMessageRead?: () => void;
  previewMode?: boolean;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  conversationId,
  otherUserId,
  onNewMessageRead,
  previewMode = false
}) => {
  const { user, isPremium } = useAuth();
  const { pointBalance: remainingPoints, refreshPoints } = useMatching();
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [messages, setMessages] = useState<(Message & { attachments?: MessageAttachment[] })[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<{
    id: string;
    username: string;
    avatar_url?: string;
    is_premium?: boolean;
    last_active?: string;
  } | null>(null);

  // ✅ 手順1：まず、プロフィール取得するstateを追加
  const [selfProfile, setSelfProfile] = useState<{
    id: string;
    username: string;
    avatar_url?: string;
  } | null>(null);
  // ✅ 手順1：ここまで

  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showHightlightOption, setShowHighlightOption] = useState<boolean>(false);
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [, setUploading] = useState<boolean>(false);
  const [showEmojiSelector, setShowEmojiSelector] = useState<boolean>(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [intimacyLevel, setIntimacyLevel] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // メッセージを常に最新に自動スクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ 手順2：useEffectで自分自身のプロフィールも取得
  useEffect(() => {
    const fetchSelfProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('自分のプロフィール取得エラー:', error);
        } else {
          setSelfProfile(data);
        }
      } catch (err) {
        console.error('自分のプロフィール取得中にエラー:', err);
      }
    };

    fetchSelfProfile();
  }, [user]);
  // ✅ 手順2：ここまで

  // 会話情報の取得
  useEffect(() => {
    const fetchConversation = async () => {
      if (!user) return;
      if (!conversationId && !otherUserId) {
        setError('会話が見つかりません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let conv: Conversation | null = null;

        // 会話IDが指定されている場合はそれを使用
        if (conversationId) {
          const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .single();

          if (error) throw error;
          if (data) {
            conv = data as Conversation;
          }
        }
        // 相手のユーザーIDが指定されている場合、会話を検索または新規作成
        else if (otherUserId) {
          // 既存の会話を検索
          const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .or(`user1_id.eq.${otherUserId},user2_id.eq.${otherUserId}`)
            .limit(1);

          if (error) throw error;

          if (data && data.length > 0) {
            conv = data[0] as Conversation;
          } else {
            // 会話がない場合は新規作成
            const { data: newConv, error: createError } = await supabase
              .from('conversations')
              .insert({
                user1_id: user.id,
                user2_id: otherUserId,
                last_message_time: new Date().toISOString(),
                is_active: true,
                user1_unread_count: 0,
                user2_unread_count: 0,
                intimacy_level: 0
              })
              .select()
              .single();

            if (createError) throw createError;
            conv = newConv as Conversation;
          }
        }

        if (!conv) {
          setError('会話が見つかりません');
          setLoading(false);
          return;
        }

        setConversation(conv);
        setIntimacyLevel(conv.intimacy_level || 0);

        // 相手のユーザー情報を取得
        const otherUserProfileId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_premium, last_active')
          .eq('id', otherUserProfileId)
          .single();

        if (userError) throw userError;
        setOtherUserProfile(userData);

        // プレビューモードではない場合のみ既読状態を更新
        if (!previewMode) {
          // 既読状態を更新
          const unreadField = conv.user1_id === user.id ? 'user1_unread_count' : 'user2_unread_count';
          await supabase
            .from('conversations')
            .update({ [unreadField]: 0 })
            .eq('id', conv.id);

          // 親コンポーネントに通知（未読メッセージが読まれたことを通知）
          if (onNewMessageRead) {
            onNewMessageRead();
          }
        }

        // メッセージを取得
        fetchMessages(conv.id);

      } catch (error) {
        console.error('会話情報の取得エラー:', error);
        setError('会話情報の取得に失敗しました');
        setLoading(false);
      }
    };

    fetchConversation();
  }, [user, conversationId, otherUserId, previewMode, onNewMessageRead]);

  // メッセージの取得
  const fetchMessages = async (convId: string) => {
    try {
      setLoading(true);

      // 基本クエリを作成
      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      // プレビューモードの場合は最新の3件のみ
      if (previewMode) {
        query = query.limit(3).order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // プレビューモードの場合は逆順に戻す
      const messagesData = previewMode ? [...data].reverse() : data;

      // 添付ファイルを取得
      const messagesWithAttachments = await Promise.all(
        messagesData.map(async (message) => {
          if (message.has_attachment) {
            const { data: attachments, error: attachmentError } = await supabase
              .from('message_attachments')
              .select('*')
              .eq('message_id', message.id);

            if (attachmentError) {
              console.error('添付ファイル取得エラー:', attachmentError);
              return { ...message, attachments: [] };
            }

            return { ...message, attachments };
          }

          return { ...message, attachments: [] };
        })
      );

      setMessages(messagesWithAttachments);
      setLoading(false);

      // プレビューモードでなければスクロール
      if (!previewMode) {
        setTimeout(scrollToBottom, 100);
      }

    } catch (error) {
      console.error('メッセージの取得エラー:', error);
      setError('メッセージの取得に失敗しました');
      setLoading(false);
    }
  };

  // 画像を選択する処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MBの制限
    if (file.size > 5 * 1024 * 1024) {
      toast.error('画像サイズは5MB以下にしてください');
      return;
    }

    setSelectedImage(file);

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 画像選択をキャンセル
  const cancelImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // 画像をアップロード
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user || !conversation) return null;

    try {
      setUploading(true);

      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `message_attachments/${conversation.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user_uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user_uploads')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      toast.error('画像のアップロードに失敗しました');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // 親密度レベルの更新
  const updateIntimacyLevel = useCallback(async () => {
    if (!user || !conversation) return;

    // メッセージ数に基づいて親密度を更新
    // 各メッセージ数のしきい値と対応するレベル
    const thresholds = [
      { count: 0, level: 0 },   // レベル0: 0通
      { count: 5, level: 1 },   // レベル1: 5通以上
      { count: 20, level: 2 },  // レベル2: 20通以上
      { count: 50, level: 3 },  // レベル3: 50通以上
      { count: 100, level: 4 }, // レベル4: 100通以上
      { count: 200, level: 5 }  // レベル5: 200通以上
    ];

    try {
      // メッセージ数を取得
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id);

      if (error) throw error;

      if (count === null) return;

      // メッセージ数に対応するレベルを検索
      let newLevel = 0;
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (count >= thresholds[i].count) {
          newLevel = thresholds[i].level;
          break;
        }
      }

      // 現在のレベルより高い場合のみ更新
      if (newLevel > (conversation.intimacy_level || 0)) {
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ intimacy_level: newLevel })
          .eq('id', conversation.id);

        if (updateError) throw updateError;

        setIntimacyLevel(newLevel);

        // レベルアップを通知
        if (newLevel > (conversation.intimacy_level || 0)) {
          toast.success(`親密度レベルが${newLevel}に上がりました！`);

          // レベルアップ報酬（プレミアム会員でない場合のみ）
          if (!isPremium) {
            const bonusPoints = newLevel * 5; // レベルに応じたポイント
            await addPoints(
              user.id,
              bonusPoints,
              'intimacy_level_up',
              conversation.id,
              `親密度レベル${newLevel}達成ボーナス`
            );

            toast.success(`${bonusPoints}ポイントを獲得しました！`);
            refreshPoints();
          }
        }
      }
    } catch (error) {
      console.error('親密度更新エラー:', error);
    }
  }, [conversation, user, isPremium, refreshPoints]);

  // 絵文字選択処理
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiSelector(false);

    // フォーカスを戻す
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // メッセージの送信
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !conversation || !otherUserProfile) return;
    if (!newMessage.trim() && !selectedImage) return;

    // 非プレミアムユーザーはポイントチェック
    if (!isPremium) {
      // 通常メッセージは1ポイント、ハイライトは5ポイント、画像付きは3ポイント追加
      const basePoints = isHighlighted ? 5 : 1;
      const imagePoints = selectedImage ? 3 : 0;
      const requiredPoints = basePoints + imagePoints;

      if (remainingPoints !== null && remainingPoints < requiredPoints) {
        toast.error(`ポイントが不足しています（必要: ${requiredPoints}ポイント）`);
        return;
      }
    }

    try {
      setSending(true);

      // 画像のアップロード（選択されている場合）
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl && !newMessage.trim()) {
          // 画像アップロードに失敗し、テキストもない場合は中止
          setSending(false);
          return;
        }
      }

      // メッセージの挿入
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserProfile.id,
          conversation_id: conversation.id,
          content: newMessage.trim() || (imageUrl ? '画像を送信しました' : ''), // 画像のみの場合はContentを空にしない
          is_highlighted: isHighlighted,
          is_read: false,
          has_attachment: !!imageUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // 画像添付がある場合、添付ファイル情報を保存
      let attachmentData: MessageAttachment[] = [];
      if (imageUrl && messageData && selectedImage) {
        const { data, error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: messageData.id,
            file_url: imageUrl,
            file_type: selectedImage.type,
            file_name: selectedImage.name,
            file_size: selectedImage.size,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (attachmentError) {
          console.error('添付ファイル保存エラー:', attachmentError);
          // メッセージ自体は送信できているので続行
        } else if (data) {
          attachmentData = [data];
        }
      }

      // 会話の最終メッセージ時間を更新
      const unreadField = conversation.user1_id === user.id
        ? 'user2_unread_count'
        : 'user1_unread_count';

      // まず、現在の未読カウントを取得
      const { data: currentConv, error: getError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation.id)
        .single();

      if (getError) throw getError;

      // 未読カウントを1増やす
      const newUnreadCount = ((currentConv as any)[unreadField] || 0) + 1;

      // 会話を更新
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          last_message_time: new Date().toISOString(),
          [unreadField]: newUnreadCount
        })
        .eq('id', conversation.id);

      if (updateError) throw updateError;

      // プレミアムでない場合はポイントを消費
      if (!isPremium) {
        const basePoints = isHighlighted ? 5 : 1;
        const imagePoints = selectedImage ? 3 : 0;
        const totalPoints = basePoints + imagePoints;

        await consumePoints(
          user.id,
          totalPoints,
          'message',
          messageData.id
        );

        // ポイント残高を更新
        refreshPoints();
      }

      // 通知を送信
      await supabase
        .from('notifications')
        .insert({
          user_id: otherUserProfile.id,
          type: 'message',
          title: 'メッセージが届きました',
          message: `${user.user_metadata?.name || 'ユーザー'}から${selectedImage ? '画像付き' : ''}メッセージが届きました`,
          is_read: false,
          created_at: new Date().toISOString(),
          link: `/messages/${conversation.id}`,
          priority: isHighlighted ? 'high' : 'medium',
          sender_id: user.id,
          notification_group: 'messages'
        });

      // 新しいメッセージを構築（添付ファイル情報を含む）
      const newMessageWithAttachments = {
        ...messageData,
        attachments: attachmentData
      };

      // 新しいメッセージを追加
      setMessages(prev => [...prev, newMessageWithAttachments]);
      setNewMessage('');
      setIsHighlighted(false);
      setSelectedImage(null);
      setImagePreview(null);

      // 画像選択をリセット
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }

      // スクロール
      setTimeout(scrollToBottom, 100);

      // 親密度を更新
      updateIntimacyLevel();

    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      toast.error('メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  // リアルタイムサブスクリプション
  useEffect(() => {
    if (!conversation || previewMode) return;

    const subscription = supabase
      .channel(`conversation:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, async (payload) => {
        const newMessage = payload.new as Message;

        // 自分が送信したメッセージは既に表示されているのでスキップ
        if (newMessage.sender_id === user?.id) return;

        // 添付ファイルを取得
        let attachments: MessageAttachment[] = [];
        if (newMessage.has_attachment) {
          const { data, error: attachmentsError } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('message_id', newMessage.id);

          if (attachmentsError) {
            console.error('添付ファイル取得エラー:', attachmentsError);
          } else if (data) {
            attachments = data;
          }
        }

        // メッセージを添付ファイル情報と共に追加
        const messageWithAttachments = {
          ...newMessage,
          attachments
        };

        setMessages(prev => [...prev, messageWithAttachments]);

        // 会話を取得している場合は既読にする
        if (conversation) {
          supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', newMessage.id)
            .then();

          // 自分の未読カウントをリセット
          const unreadField = conversation.user1_id === user?.id
            ? 'user1_unread_count'
            : 'user2_unread_count';

          supabase
            .from('conversations')
            .update({ [unreadField]: 0 })
            .eq('id', conversation.id)
            .then();

          // 親コンポーネントに通知
          if (onNewMessageRead) {
            onNewMessageRead();
          }
        }

        // スクロール
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversation, user, previewMode, onNewMessageRead]);

  // 入力フィールドの高さ自動調整
  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // 親密度レベルに応じた色を返す
  const getIntimacyColor = (level: number): string => {
    switch (level) {
      case 0: return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 1: return 'bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 2: return 'bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 3: return 'bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 4: return 'bg-pink-200 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
      case 5: return 'bg-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // 親密度レベルに応じたラベルを返す
  const getIntimacyLabel = (level: number): string => {
    switch (level) {
      case 0: return '初対面';
      case 1: return '知り合い';
      case 2: return '友達';
      case 3: return '親友';
      case 4: return '親密';
      case 5: return '親密★';
      default: return '初対面';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-dark-text-secondary">メッセージを表示するにはログインが必要です</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-white dark:bg-dark-surface rounded-lg shadow-sm ${previewMode ? 'h-96' : 'h-full max-h-[70vh]'}`}>
      {/* ヘッダー */}
      {otherUserProfile && (
        <div className="border-b dark:border-dark-border p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 relative">
              {otherUserProfile.avatar_url ? (
                <img
                  src={otherUserProfile.avatar_url}
                  alt={otherUserProfile.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-indigo-700 dark:text-indigo-300 font-bold">
                    {otherUserProfile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {otherUserProfile.is_premium && (
                <span className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1">
                  <Crown className="w-3 h-3 text-white" />
                </span>
              )}
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                {otherUserProfile.username}
              </h3>
              <div className="flex items-center text-xs text-gray-500 dark:text-dark-text-secondary">
                {otherUserProfile.last_active ? (
                  <span>
                    {formatDistanceToNow(new Date(otherUserProfile.last_active), {
                      addSuffix: true,
                      locale: ja
                    })}にオンライン
                  </span>
                ) : (
                  <span>オフライン</span>
                )}
              </div>
            </div>
          </div>

          {!previewMode && (
            <div className="flex items-center">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getIntimacyColor(intimacyLevel)}`}>
                {getIntimacyLabel(intimacyLevel)}
              </span>

              <Link
                to={`/profile/${otherUserProfile.id}`}
                className="ml-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
              >
                プロフィール
              </Link>
            </div>
          )}
        </div>
      )}

     {/* メッセージリスト */}
<div className={`flex-1 p-4 overflow-y-auto ${previewMode ? 'max-h-48' : ''}`}>
  {messages.length === 0 ? (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-dark-text-secondary py-8">
      <p>メッセージがありません</p>
      <p className="mt-2 text-sm">最初のメッセージを送ってみましょう！</p>
    </div>
  ) : (
    <div className="space-y-4">
      {messages.map((message) => {
        const isSender = message.sender_id === user?.id;
        const hasAttachments = message.attachments && message.attachments.length > 0;

        return (
          <div
            key={message.id}
            className={`flex ${isSender ? 'justify-end' : 'justify-start'} items-end gap-2`}
          >
            {/* 相手側メッセージならアイコン左 */}
            {!isSender && otherUserProfile && (
              <div className="w-8 h-8 flex-shrink-0">
                {otherUserProfile.avatar_url ? (
                  <img
                    src={otherUserProfile.avatar_url}
                    alt={otherUserProfile.username || 'avatar'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                    {otherUserProfile.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            )}

            {/* メッセージ吹き出し */}
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.is_highlighted
                  ? 'bg-yellow-50 border-2 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-600'
                  : isSender
                    ? 'bg-indigo-500 text-white dark:bg-indigo-600'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-dark-text-primary'
              }`}
            >
              {/* メッセージのテキスト */}
              {message.content && ( // content が空でない場合のみ表示
                 <div className="text-sm break-words">
                   {message.content}
                 </div>
              )}


              {/* 添付画像がある場合 */}
              {hasAttachments && message.attachments && message.attachments.map((attachment, index) => (
                <div key={index} className={`mt-2 ${message.content ? '' : 'mt-0'}`}> {/* content がない場合は mt-0 */}
                  {attachment.file_type.startsWith('image/') ? (
                    <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={attachment.file_url}
                        alt="添付画像"
                        className="max-h-48 rounded-lg object-cover border border-gray-100 dark:border-dark-border"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center p-2 rounded-md ${
                        message.is_highlighted
                          ? 'bg-yellow-100 dark:bg-yellow-900/50'
                          : isSender ? 'bg-indigo-400 dark:bg-indigo-500' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <PaperclipIcon className={`w-4 h-4 mr-2 ${
                        message.is_highlighted
                          ? 'text-yellow-800 dark:text-yellow-300'
                          : isSender ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                      }`} />
                      <span className={`text-xs truncate ${
                        message.is_highlighted
                          ? 'text-yellow-800 dark:text-yellow-300'
                          : isSender ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {attachment.file_name}
                      </span>
                    </a>
                  )}
                </div>
              ))}

              {/* タイムスタンプと既読状態 */}
              <div className={`text-right mt-1 flex items-center justify-end text-xs ${
                message.is_highlighted
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : isSender ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {formatDistanceToNow(new Date(message.created_at), {
                  addSuffix: true,
                  locale: ja
                })}
                {isSender && (
                  <span className="ml-1">
                    {message.is_read ? (
                      <span>既読</span>
                    ) : (
                      <Clock className="inline-block w-3 h-3 ml-1" />
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* 自分側メッセージならアイコン右 */}
            {/* ✅ 手順3：自分側メッセージ表示のときは「selfProfile」を使う */}
            {isSender && selfProfile && (
              <div className="w-8 h-8 flex-shrink-0">
                {selfProfile.avatar_url ? (
                  <img
                    src={selfProfile.avatar_url}
                    alt={selfProfile.username || 'avatar'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                    {selfProfile.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            )}
            {/* ✅ 手順3：ここまで */}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  )}
</div>

       {/* メッセージ入力（プレビューモードでは非表示） */}
       {!previewMode && (
         <form onSubmit={sendMessage} className="border-t dark:border-dark-border p-4">
           {/* 画像プレビュー */}
           {imagePreview && (
             <div className="mb-2 relative">
               <div className="relative inline-block">
                 <img
                   src={imagePreview}
                   alt="プレビュー"
                   className="h-24 rounded-md object-cover"
                 />
                 <button
                   type="button"
                   onClick={cancelImageSelection}
                   className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                 >
                   <XCircle className="w-4 h-4" />
                 </button>
               </div>
             </div>
           )}

           {/* ハイライトオプション */}
           {showHightlightOption && (
             <div className="mb-2 flex items-center">
               <label className="flex items-center text-sm text-gray-700 dark:text-dark-text-primary">
                 <input
                   type="checkbox"
                   checked={isHighlighted}
                   onChange={() => setIsHighlighted(!isHighlighted)}
                   className="mr-2"
                 />
                 <span className="mr-2">ハイライトメッセージ</span>
                 {!isPremium && (
                   <span className="text-xs text-indigo-600 dark:text-indigo-400">
                     (5ポイント)
                   </span>
                 )}
               </label>
               {isPremium && (
                 <span className="ml-auto text-xs flex items-center text-yellow-600 dark:text-yellow-400">
                   <Crown className="w-3 h-3 mr-1" />
                   プレミアム特典
                 </span>
               )}
             </div>
           )}

           {/* メッセージ入力エリア */}
           <div className="flex items-end">
             {/* 絵文字ピッカーボタン */}
             <button
               type="button"
               onClick={() => setShowEmojiSelector(!showEmojiSelector)}
               className="px-2 py-2 text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </button>

             {/* 画像添付ボタン */}
             <label className="px-2 py-2 text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors cursor-pointer">
               <ImageIcon className="w-5 h-5" />
               <input
                 type="file"
                 ref={imageInputRef}
                 accept="image/*"
                 onChange={handleImageSelect}
                 className="hidden"
               />
             </label>

             {/* テキスト入力欄 */}
             <div className="flex-1 relative">
               <textarea
                 ref={textareaRef}
                 placeholder="メッセージを入力..."
                 value={newMessage}
                 onChange={(e) => {
                   setNewMessage(e.target.value);
                   adjustTextareaHeight(e);
                 }}
                 onFocus={() => setShowHighlightOption(true)}
                 className="w-full border dark:border-dark-border rounded-lg pl-4 pr-10 py-2 min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none dark:bg-dark-surface dark:text-dark-text-primary"
                 style={{ height: '40px' }}
               />
               {!isPremium && (
                 <div className="absolute right-2 bottom-2 text-xs text-gray-500 dark:text-dark-text-secondary">
                   {remainingPoints}p
                 </div>
               )}
             </div>

             {/* 送信ボタン */}
             <button
               type="submit"
               disabled={sending || (!newMessage.trim() && !selectedImage) || (!isPremium && remainingPoints !== null && remainingPoints < (isHighlighted ? 5 : 1 + (selectedImage ? 3 : 0)))} // 画像ポイントも考慮
               className={`ml-2 p-2 rounded-full ${
                 sending || (!newMessage.trim() && !selectedImage) || (!isPremium && remainingPoints !== null && remainingPoints < (isHighlighted ? 5 : 1 + (selectedImage ? 3 : 0)))
                   ? 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                   : 'bg-indigo-500 text-white hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700'
               }`}
             >
               <Send className="w-5 h-5" />
             </button>
           </div>

           {showEmojiSelector && (
             <div className="absolute bottom-16 z-10"> {/* z-10 を追加して他の要素より手前に表示 */}
               <EmojiSelector onSelect={handleEmojiSelect} />
             </div>
           )}

           {/* ポイント不足警告 */}
           {!isPremium && remainingPoints !== null && remainingPoints < 1 && (
             <div className="mt-2 text-xs text-red-500 dark:text-red-400 flex items-center">
               <Lock className="w-3 h-3 mr-1" />
               ポイントが不足しています。
               <a href="/points/purchase" className="ml-1 text-indigo-600 hover:underline dark:text-indigo-400">
                 ポイントを購入
               </a>
               または
               <a href="/premium" className="ml-1 text-yellow-600 hover:underline dark:text-yellow-400">
                 プレミアム会員になる
               </a>
             </div>
           )}

           {/* メッセージ送信料金表示 */}
           {!isPremium && remainingPoints !== null && ( // 残高がnullでない場合のみ表示
             <div className="mt-2 text-xs text-gray-500 dark:text-dark-text-secondary">
               メッセージ: 1ポイント
               {selectedImage && ' + 画像: 3ポイント'}
               {isHighlighted && ' + ハイライト: 5ポイント'}
               {isPremium && <span className="ml-1 text-yellow-600 dark:text-yellow-400">（プレミアム会員は無料）</span>}
             </div>
           )}
         </form>
       )}

       {/* プレビューモードの場合の全文表示リンク */}
       {previewMode && conversation && (
         <div className="border-t dark:border-dark-border p-3 text-center">
           <Link
             to={`/messages/${conversation.id}`}
             className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm"
           >
             すべてのメッセージを見る
           </Link>
         </div>
       )}
     </div>
   );
 };

 export default ConversationView;