// src/components/messaging/MessageCompose.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import usePoints from '../../hooks/usePoints';
import { POINT_COSTS } from '../../hooks/usePoints';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faStar, faCoins, faLock } from '@fortawesome/free-solid-svg-icons';

interface MessageComposeProps {
 onSendMessage: (content: string, isHighlighted: boolean) => Promise<boolean>;
 disabled?: boolean;
 recipientName?: string; // 相手の名前（オプション）
}

const MessageCompose: React.FC<MessageComposeProps> = ({
 onSendMessage,
 disabled = false,
 recipientName
}) => {
 const [message, setMessage] = useState<string>('');
 const [isHighlighted, setIsHighlighted] = useState<boolean>(false);
 const [isSending, setIsSending] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);
 const { isPremium } = useAuth();
 const { balance, hasEnoughPoints } = usePoints();
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 // テキストエリアの高さを自動調整
 useEffect(() => {
   if (textareaRef.current) {
     textareaRef.current.style.height = 'auto';
     textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
   }
 }, [message]);

 // ハイライトメッセージが選択されている状態で、ポイントが不足している場合に警告
 useEffect(() => {
   if (isHighlighted && !hasEnoughPoints(POINT_COSTS.HIGHLIGHT_MESSAGE)) {
     setError(`ハイライトメッセージには${POINT_COSTS.HIGHLIGHT_MESSAGE}ポイントが必要です`);
   } else if (!isHighlighted && !hasEnoughPoints(POINT_COSTS.REGULAR_MESSAGE)) {
     setError(`メッセージ送信には${POINT_COSTS.REGULAR_MESSAGE}ポイントが必要です`);
   } else {
     setError(null);
   }
 }, [isHighlighted, hasEnoughPoints]);

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   
   if (!message.trim()) {
     return;
   }

   // 送信中または無効状態の場合は処理しない
   if (isSending || disabled) {
     return;
   }

   // ポイントのチェック
   const pointCost = isHighlighted ? POINT_COSTS.HIGHLIGHT_MESSAGE : POINT_COSTS.REGULAR_MESSAGE;
   if (!hasEnoughPoints(pointCost)) {
     setError(`ポイントが不足しています（必要: ${pointCost}ポイント）`);
     return;
   }

   setIsSending(true);
   setError(null);

   try {
     const success = await onSendMessage(message.trim(), isHighlighted);
     
     if (success) {
       setMessage('');
       setIsHighlighted(false);
     } else {
       setError('メッセージの送信に失敗しました');
     }
   } catch (err) {
     console.error('Error sending message:', err);
     setError('メッセージの送信中にエラーが発生しました');
   } finally {
     setIsSending(false);
   }
 };

 const handleHighlightToggle = () => {
   // プレミアム会員でない場合はハイライト機能を使用不可
   if (!isPremium) {
     return;
   }
   setIsHighlighted(prev => !prev);
 };

 return (
   <div className="mt-4 border-t pt-3">
     {error && (
       <div className="mb-2 text-red-600 text-sm font-medium">
         <span className="flex items-center">
           <FontAwesomeIcon icon={faLock} className="mr-1" />
           {error}
         </span>
       </div>
     )}
     
     <form onSubmit={handleSubmit} className="relative">
       <textarea
         ref={textareaRef}
         value={message}
         onChange={(e) => setMessage(e.target.value)}
         placeholder={disabled 
           ? "このユーザーとはメッセージを交換できません" 
           : recipientName 
             ? `${recipientName}さんにメッセージを送信...` 
             : "メッセージを入力..."
         }
         className={`w-full p-3 pr-16 border ${
           isHighlighted ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
         } rounded-lg resize-none min-h-[60px] transition-colors focus:outline-none focus:ring-2 ${
           isHighlighted ? 'focus:ring-yellow-400' : 'focus:ring-blue-500'
         }`}
         disabled={disabled || isSending}
         rows={1}
         maxLength={500}
       />
       
       <div className="absolute bottom-3 right-3 flex space-x-2">
         {/* ハイライトボタン - プレミアム会員のみ使用可能 */}
         <button
           type="button"
           onClick={handleHighlightToggle}
           disabled={!isPremium || disabled || isSending}
           className={`rounded-full p-2 transition-colors focus:outline-none ${
             !isPremium 
               ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
               : isHighlighted
                 ? 'bg-yellow-400 text-white hover:bg-yellow-500' 
                 : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
           }`}
           title={isPremium ? 'ハイライトメッセージ' : 'プレミアム会員限定機能'}
         >
           <FontAwesomeIcon icon={faStar} />
         </button>
         
         {/* 送信ボタン */}
         <button
           type="submit"
           disabled={disabled || isSending || !message.trim() || (isHighlighted && !hasEnoughPoints(POINT_COSTS.HIGHLIGHT_MESSAGE)) || (!isHighlighted && !hasEnoughPoints(POINT_COSTS.REGULAR_MESSAGE))}
           className={`rounded-full p-2 transition-colors focus:outline-none ${
             disabled || isSending || !message.trim() || (isHighlighted && !hasEnoughPoints(POINT_COSTS.HIGHLIGHT_MESSAGE)) || (!isHighlighted && !hasEnoughPoints(POINT_COSTS.REGULAR_MESSAGE))
               ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
               : isHighlighted
                 ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                 : 'bg-blue-500 text-white hover:bg-blue-600'
           }`}
           title="送信"
         >
           <FontAwesomeIcon icon={faPaperPlane} />
         </button>
       </div>
     </form>
     
     {/* ポイント表示 */}
     <div className="mt-1 text-right text-sm text-gray-500 flex justify-end items-center">
       <FontAwesomeIcon icon={faCoins} className="mr-1 text-yellow-500" />
       <span>
         {isHighlighted 
           ? `送信すると${POINT_COSTS.HIGHLIGHT_MESSAGE}ポイント消費`
           : `送信すると${POINT_COSTS.REGULAR_MESSAGE}ポイント消費`
         } (残高: {balance !== null ? balance : '読込中'})
       </span>
     </div>
     
     {/* 文字数カウンター */}
     <div className="mt-1 text-right text-xs text-gray-400">
       {message.length}/500文字
     </div>
   </div>
 );
};

export default MessageCompose;