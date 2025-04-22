// src/components/messaging/MessageCompose.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import usePoints from '@/hooks/usePoints';
import { POINT_COSTS } from '@/hooks/usePoints';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faStar, faCoins, faLock, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import verificationService, { VerificationLevel } from '@/services/verificationService';

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
 const { balance, hasEnoughPoints, consumePoints } = usePoints();
 const textareaRef = useRef<HTMLTextAreaElement>(null);
 const [verificationState, setVerificationState] = useState<{
   level: VerificationLevel;
   loading: boolean;
 }>({
   level: VerificationLevel.EMAIL_ONLY,
   loading: true
 });

 // 認証レベルを取得
 useEffect(() => {
   const fetchVerificationLevel = async () => {
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
 }, []);

 // テキストエリアの高さを自動調整
 useEffect(() => {
   if (textareaRef.current) {
     textareaRef.current.style.height = 'auto';
     textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
   }
 }, [message]);

 // ハイライトメッセージが選択されている状態で、ポイントが不足している場合に警告
 useEffect(() => {
   if (isHighlighted && !isPremium && !hasEnoughPoints(POINT_COSTS.HIGHLIGHT_MESSAGE)) {
     setError(`ハイライトメッセージには${POINT_COSTS.HIGHLIGHT_MESSAGE}ポイントが必要です`);
   } else if (!isHighlighted && !isPremium && !hasEnoughPoints(POINT_COSTS.REGULAR_MESSAGE)) {
     setError(`メッセージ送信には${POINT_COSTS.REGULAR_MESSAGE}ポイントが必要です`);
   } else if (verificationState.level < VerificationLevel.PHONE_VERIFIED && !verificationState.loading) {
     setError('メッセージ送信には電話番号認証が必要です');
   } else {
     setError(null);
   }
 }, [isHighlighted, hasEnoughPoints, isPremium, verificationState]);

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   
   if (!message.trim()) {
     return;
   }

   // 送信中または無効状態の場合は処理しない
   if (isSending || disabled) {
     return;
   }
   
   // 認証レベルチェック
   if (verificationState.level < VerificationLevel.PHONE_VERIFIED) {
     setError('メッセージ送信には電話番号認証が必要です');
     return;
   }

   // ポイントのチェック（プレミアム会員はスキップ）
   if (!isPremium) {
     const pointCost = isHighlighted ? POINT_COSTS.HIGHLIGHT_MESSAGE : POINT_COSTS.REGULAR_MESSAGE;
     if (!hasEnoughPoints(pointCost)) {
       setError(`ポイントが不足しています（必要: ${pointCost}ポイント）`);
       return;
     }
   }

   setIsSending(true);
   setError(null);

   try {
     // メッセージ送信
     const success = await onSendMessage(message.trim(), isHighlighted);
     
     if (success) {
       // ポイント消費処理（プレミアム会員はスキップ）
       if (!isPremium) {
         const pointCost = isHighlighted ? POINT_COSTS.HIGHLIGHT_MESSAGE : POINT_COSTS.REGULAR_MESSAGE;
         await consumePoints(
           pointCost, 
           'message', 
           undefined, 
           isHighlighted ? 'ハイライトメッセージ送信' : 'メッセージ送信'
         );
       }
       
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

 // 認証レベルに基づく送信ボタンの無効化条件
 const isSendButtonDisabled = 
   disabled || 
   isSending || 
   !message.trim() || 
   verificationState.level < VerificationLevel.PHONE_VERIFIED ||
   (!isPremium && isHighlighted && !hasEnoughPoints(POINT_COSTS.HIGHLIGHT_MESSAGE)) || 
   (!isPremium && !isHighlighted && !hasEnoughPoints(POINT_COSTS.REGULAR_MESSAGE));

 return (
   <div className="mt-4 border-t dark:border-dark-border pt-3">
     {verificationState.level < VerificationLevel.PHONE_VERIFIED && !verificationState.loading && (
       <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-800/50 rounded-md text-sm">
         <p className="flex items-center text-yellow-800 dark:text-yellow-300">
           <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
           メッセージ送信には電話番号認証が必要です。
           <a href="/profile/verification" className="ml-2 text-blue-600 dark:text-blue-400 font-medium hover:underline">
             今すぐ認証する
           </a>
         </p>
       </div>
     )}
     
     {error && (
       <div className="mb-2 text-red-600 dark:text-red-400 text-sm font-medium">
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
         placeholder={
           verificationState.level < VerificationLevel.PHONE_VERIFIED 
             ? "メッセージを送信するには電話番号認証が必要です" 
             : disabled 
               ? "このユーザーとはメッセージを交換できません" 
               : recipientName 
                 ? `${recipientName}さんにメッセージを送信...` 
                 : "メッセージを入力..."
         }
         className={`w-full p-3 pr-16 border ${
           isHighlighted ? 'border-yellow-400 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-primary'
         } rounded-lg resize-none min-h-[60px] transition-colors focus:outline-none focus:ring-2 ${
           isHighlighted ? 'focus:ring-yellow-400 dark:focus:ring-yellow-500' : 'focus:ring-blue-500 dark:focus:ring-blue-400'
         }`}
         disabled={disabled || isSending || verificationState.level < VerificationLevel.PHONE_VERIFIED}
         rows={1}
         maxLength={500}
       />
       
       <div className="absolute bottom-3 right-3 flex space-x-2">
         {/* ハイライトボタン - プレミアム会員のみ使用可能 */}
         <button
           type="button"
           onClick={handleHighlightToggle}
           disabled={!isPremium || disabled || isSending || verificationState.level < VerificationLevel.PHONE_VERIFIED}
           className={`rounded-full p-2 transition-colors focus:outline-none ${
             !isPremium || verificationState.level < VerificationLevel.PHONE_VERIFIED
               ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
               : isHighlighted
                 ? 'bg-yellow-400 dark:bg-yellow-500 text-white hover:bg-yellow-500 dark:hover:bg-yellow-600' 
                 : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
           }`}
           title={isPremium ? 'ハイライトメッセージ' : 'プレミアム会員限定機能'}
         >
           <FontAwesomeIcon icon={faStar} />
         </button>
         
         {/* 送信ボタン */}
         <button
           type="submit"
           disabled={isSendButtonDisabled}
           className={`rounded-full p-2 transition-colors focus:outline-none ${
             isSendButtonDisabled
               ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
               : isHighlighted
                 ? 'bg-yellow-500 dark:bg-yellow-600 text-white hover:bg-yellow-600 dark:hover:bg-yellow-700'
                 : 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700'
           }`}
           title="送信"
         >
           <FontAwesomeIcon icon={faPaperPlane} />
         </button>
       </div>
     </form>
     
     {/* ポイント表示 - 認証レベルが十分の場合のみ表示 */}
     {verificationState.level >= VerificationLevel.PHONE_VERIFIED && (
       <div className="mt-1 text-right text-sm text-gray-500 dark:text-dark-text-secondary flex justify-end items-center">
         <FontAwesomeIcon icon={faCoins} className="mr-1 text-yellow-500 dark:text-yellow-400" />
         <span>
           {isPremium 
             ? 'プレミアム会員：ポイント消費なし'
             : isHighlighted 
               ? `送信すると${POINT_COSTS.HIGHLIGHT_MESSAGE}ポイント消費`
               : `送信すると${POINT_COSTS.REGULAR_MESSAGE}ポイント消費`
           } {!isPremium && `(残高: ${balance !== null ? balance : '読込中'})`}
         </span>
       </div>
     )}
     
     {/* 文字数カウンター */}
     <div className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
       {message.length}/500文字
     </div>
   </div>
 );
};

export default MessageCompose;