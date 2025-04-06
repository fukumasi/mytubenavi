// src/components/messaging/ConversationView.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Message, Conversation } from '../../types/matching';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Send, Clock, Crown, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMatching } from '../../hooks/useMatching';

interface ConversationViewProps {
 conversationId?: string;
 otherUserId?: string;
}

const ConversationView: React.FC<ConversationViewProps> = ({ conversationId, otherUserId }) => {
 const { user, isPremium } = useAuth();
 const { consumePoints, remainingPoints } = useMatching();
 const [loading, setLoading] = useState<boolean>(true);
 const [sending, setSending] = useState<boolean>(false);
 const [messages, setMessages] = useState<Message[]>([]);
 const [newMessage, setNewMessage] = useState<string>('');
 const [conversation, setConversation] = useState<Conversation | null>(null);
 const [otherUserProfile, setOtherUserProfile] = useState<{
   id: string;
   username: string;
   avatar_url?: string;
   is_premium?: boolean;
 } | null>(null);
 const [error, setError] = useState<string | null>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const [showHightlightOption, setShowHighlightOption] = useState<boolean>(false);
 const [isHighlighted, setIsHighlighted] = useState<boolean>(false);

 // メッセージを常に最新に自動スクロール
 const scrollToBottom = () => {
   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

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
               user2_unread_count: 0
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
       
       // 相手のユーザー情報を取得
       const otherUserProfileId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
       const { data: userData, error: userError } = await supabase
         .from('profiles')
         .select('id, username, avatar_url, is_premium')
         .eq('id', otherUserProfileId)
         .single();
       
       if (userError) throw userError;
       setOtherUserProfile(userData);
       
       // 既読状態を更新
       const unreadField = conv.user1_id === user.id ? 'user1_unread_count' : 'user2_unread_count';
       await supabase
         .from('conversations')
         .update({ [unreadField]: 0 })
         .eq('id', conv.id);
       
       // メッセージを取得
       fetchMessages(conv.id);
       
     } catch (error) {
       console.error('会話情報の取得エラー:', error);
       setError('会話情報の取得に失敗しました');
       setLoading(false);
     }
   };
   
   fetchConversation();
 }, [user, conversationId, otherUserId]);

 // メッセージの取得
 const fetchMessages = async (convId: string) => {
   try {
     setLoading(true);
     
     const { data, error } = await supabase
       .from('messages')
       .select('*')
       .eq('conversation_id', convId)
       .order('created_at', { ascending: true });
     
     if (error) throw error;
     
     setMessages(data as Message[]);
     setLoading(false);
     
     // メッセージがあればスクロール
     setTimeout(scrollToBottom, 100);
     
   } catch (error) {
     console.error('メッセージの取得エラー:', error);
     setError('メッセージの取得に失敗しました');
     setLoading(false);
   }
 };

 // メッセージの送信
 const sendMessage = async (e: React.FormEvent) => {
   e.preventDefault();
   
   if (!user || !conversation || !newMessage.trim() || !otherUserProfile) return;
   
   // 非プレミアムユーザーはポイントチェック
   if (!isPremium) {
     // 通常メッセージは1ポイント、ハイライトは10ポイント
     const requiredPoints = isHighlighted ? 10 : 1;
     
     if (remainingPoints < requiredPoints) {
       toast.error(`ポイントが不足しています（必要: ${requiredPoints}ポイント）`);
       return;
     }
   }
   
   try {
     setSending(true);
     
     // メッセージの挿入
     const { data: messageData, error: messageError } = await supabase
       .from('messages')
       .insert({
         sender_id: user.id,
         receiver_id: otherUserProfile.id,
         conversation_id: conversation.id,
         content: newMessage.trim(),
         is_highlighted: isHighlighted,
         is_read: false,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       })
       .select()
       .single();
     
     if (messageError) throw messageError;
     
     // 会話の最終メッセージ時間を更新
     const unreadField = conversation.user1_id === user.id 
       ? 'user2_unread_count' 
       : 'user1_unread_count';
     
     const { error: updateError } = await supabase
       .from('conversations')
       .update({ 
         last_message_time: new Date().toISOString(),
         [unreadField]: supabase.rpc('increment', { row_id: 1 })
       })
       .eq('id', conversation.id);
     
     if (updateError) throw updateError;
     
     // プレミアムでない場合はポイントを消費
     if (!isPremium) {
       const pointAmount = isHighlighted ? 10 : 1;
       await consumePoints(
         pointAmount, 
         'message', 
         messageData.id
       );
     }
     
     // 通知を送信
     await supabase
       .from('notifications')
       .insert({
         user_id: otherUserProfile.id,
         type: 'message',
         title: 'メッセージが届きました',
         message: `${user.user_metadata?.name || 'ユーザー'}からメッセージが届きました`,
         is_read: false,
         created_at: new Date().toISOString(),
         link: `/messages/${conversation.id}`,
         priority: isHighlighted ? 'high' : 'medium',
         sender_id: user.id,
         notification_group: 'messages'
       });
     
     // 新しいメッセージを追加
     setMessages(prev => [...prev, messageData as Message]);
     setNewMessage('');
     setIsHighlighted(false);
     
     // スクロール
     setTimeout(scrollToBottom, 100);
     
   } catch (error) {
     console.error('メッセージ送信エラー:', error);
     toast.error('メッセージの送信に失敗しました');
   } finally {
     setSending(false);
   }
 };

 // リアルタイムサブスクリプション
 useEffect(() => {
   if (!conversation) return;
   
   const subscription = supabase
     .channel(`conversation:${conversation.id}`)
     .on('postgres_changes', { 
       event: 'INSERT', 
       schema: 'public', 
       table: 'messages',
       filter: `conversation_id=eq.${conversation.id}`
     }, (payload) => {
       const newMessage = payload.new as Message;
       
       // 自分が送信したメッセージは既に表示されているのでスキップ
       if (newMessage.sender_id === user?.id) return;
       
       // メッセージを追加
       setMessages(prev => [...prev, newMessage]);
       
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
       }
       
       // スクロール
       setTimeout(scrollToBottom, 100);
     })
     .subscribe();
     
   return () => {
     subscription.unsubscribe();
   };
 }, [conversation, user]);

 // 入力フィールドの高さ自動調整
 const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
   const textarea = e.target;
   textarea.style.height = 'auto';
   textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
 };

 if (!user) {
   return (
     <div className="flex items-center justify-center h-64">
       <p className="text-gray-500">メッセージを表示するにはログインが必要です</p>
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
       <p className="text-red-500">{error}</p>
     </div>
   );
 }

 return (
   <div className="flex flex-col h-full max-h-[70vh] bg-white rounded-lg shadow-sm">
     {/* ヘッダー */}
     {otherUserProfile && (
       <div className="border-b p-4 flex items-center">
         <div className="flex-shrink-0 w-10 h-10 relative">
           {otherUserProfile.avatar_url ? (
             <img 
               src={otherUserProfile.avatar_url} 
               alt={otherUserProfile.username} 
               className="w-full h-full rounded-full object-cover"
             />
           ) : (
             <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center">
               <span className="text-indigo-700 font-bold">
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
           <h3 className="text-lg font-semibold text-gray-900">
             {otherUserProfile.username}
           </h3>
         </div>
       </div>
     )}

     {/* メッセージリスト */}
     <div className="flex-1 p-4 overflow-y-auto">
       {messages.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-8">
           <p>メッセージがありません</p>
           <p className="mt-2 text-sm">最初のメッセージを送ってみましょう！</p>
         </div>
       ) : (
         <div className="space-y-4">
           {messages.map((message) => {
             const isSender = message.sender_id === user?.id;
             
             return (
               <div 
                 key={message.id} 
                 className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
               >
                 <div 
                   className={`max-w-[80%] rounded-lg px-4 py-2 ${
                     message.is_highlighted
                       ? 'bg-yellow-50 border-2 border-yellow-300'
                       : isSender
                         ? 'bg-indigo-500 text-white'
                         : 'bg-gray-100 text-gray-800'
                   }`}
                 >
                   <div className={`text-sm ${
                     message.is_highlighted
                       ? 'text-yellow-800'
                       : isSender ? 'text-white' : 'text-gray-800'
                   }`}>
                     {message.content}
                   </div>
                   <div className={`text-right mt-1 flex items-center justify-end text-xs ${
                     message.is_highlighted
                       ? 'text-yellow-600'
                       : isSender ? 'text-indigo-100' : 'text-gray-500'
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
               </div>
             );
           })}
           <div ref={messagesEndRef} />
         </div>
       )}
     </div>

     {/* メッセージ入力 */}
     <form onSubmit={sendMessage} className="border-t p-4">
       {showHightlightOption && (
         <div className="mb-2 flex items-center">
           <label className="flex items-center text-sm text-gray-700">
             <input
               type="checkbox"
               checked={isHighlighted}
               onChange={() => setIsHighlighted(!isHighlighted)}
               className="mr-2"
             />
             <span className="mr-2">ハイライトメッセージ</span>
             {!isPremium && (
               <span className="text-xs text-indigo-600">
                 (10ポイント)
               </span>
             )}
           </label>
           {isPremium && (
             <span className="ml-auto text-xs flex items-center text-yellow-600">
               <Crown className="w-3 h-3 mr-1" />
               プレミアム特典
             </span>
           )}
         </div>
       )}
       
       <div className="flex items-end">
         <div className="flex-1 relative">
           <textarea
             placeholder="メッセージを入力..."
             value={newMessage}
             onChange={(e) => {
               setNewMessage(e.target.value);
               adjustTextareaHeight(e);
             }}
             onFocus={() => setShowHighlightOption(true)}
             className="w-full border rounded-lg pl-4 pr-10 py-2 min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
             style={{ height: '40px' }}
           />
           {!isPremium && (
             <div className="absolute right-2 bottom-2 text-xs text-gray-500">
               {remainingPoints}p
             </div>
           )}
         </div>
         <button
           type="submit"
           disabled={sending || !newMessage.trim() || (!isPremium && remainingPoints < (isHighlighted ? 10 : 1))}
           className={`ml-2 p-2 rounded-full ${
             sending || !newMessage.trim() || (!isPremium && remainingPoints < (isHighlighted ? 10 : 1))
               ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
               : 'bg-indigo-500 text-white hover:bg-indigo-600'
           }`}
         >
           <Send className="w-5 h-5" />
         </button>
       </div>
       
       {!isPremium && remainingPoints < 1 && (
         <div className="mt-2 text-xs text-red-500 flex items-center">
           <Lock className="w-3 h-3 mr-1" />
           ポイントが不足しています。
           <a href="/points/purchase" className="ml-1 text-indigo-600 hover:underline">
             ポイントを購入
           </a>
           または
           <a href="/premium" className="ml-1 text-yellow-600 hover:underline">
             プレミアム会員になる
           </a>
         </div>
       )}
     </form>
   </div>
 );
};

export default ConversationView;