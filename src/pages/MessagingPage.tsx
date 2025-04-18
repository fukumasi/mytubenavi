// src/pages/MessagingPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MessageList from '../components/messaging/MessageList';
import ConversationView from '../components/messaging/ConversationView';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MessageCircle, Inbox, Users, Shield, AlertTriangle, Award } from 'lucide-react';
import useMessaging from '../hooks/useMessaging';
import VerificationGuard from '../components/matching/VerificationGuard';
import { VerificationLevel } from '../services/verificationService';

const MessagingPage: React.FC = () => {
 const { conversationId } = useParams<{ conversationId?: string }>();
 const { user, loading: authLoading, isPremium } = useAuth();
 const { setCurrentConversation, verificationState } = useMessaging();
 const navigate = useNavigate();
 const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
 const [isMobile, setIsMobile] = useState<boolean>(false);
 const [showList, setShowList] = useState<boolean>(true);

 // 画面サイズに応じてレイアウトを調整
 useEffect(() => {
   const checkMobile = () => {
     setIsMobile(window.innerWidth < 768);
   };

   checkMobile();
   window.addEventListener('resize', checkMobile);
   
   return () => {
     window.removeEventListener('resize', checkMobile);
   };
 }, []);

 // URLパラメータからconversationIdを取得して選択状態を設定
 useEffect(() => {
   if (conversationId) {
     setSelectedConversationId(conversationId);
     setCurrentConversation(conversationId);
     if (isMobile) {
       setShowList(false);
     }
   } else {
     setSelectedConversationId(null);
     setCurrentConversation(null);
     setShowList(true);
   }
 }, [conversationId, isMobile, setCurrentConversation]);

 // 会話が選択されたときの処理
 const handleSelectConversation = (id: string) => {
   setSelectedConversationId(id);
   setCurrentConversation(id);
   navigate(`/messages/${id}`);
   
   if (isMobile) {
     setShowList(false);
   }
 };

 // モバイル時の戻るボタン処理
 const handleBackToList = () => {
   setShowList(true);
   navigate('/messages');
 };

 if (authLoading) {
   return (
     <div className="flex items-center justify-center h-screen">
       <LoadingSpinner />
     </div>
   );
 }

 if (!user) {
   return (
     <div className="container mx-auto px-4 py-8">
       <div className="flex flex-col items-center justify-center h-64 text-center">
         <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
         <h2 className="text-2xl font-bold text-gray-800 mb-2">メッセージングを利用するにはログインが必要です</h2>
         <p className="text-gray-600 mb-6">アカウントを作成するか、ログインしてください</p>
         <div className="flex space-x-4">
           <button
             onClick={() => navigate('/login')}
             className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
           >
             ログイン
           </button>
           <button
             onClick={() => navigate('/signup')}
             className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
           >
             アカウント作成
           </button>
         </div>
       </div>
     </div>
   );
 }

 return (
   <VerificationGuard
     requiredLevel={VerificationLevel.PHONE_VERIFIED}
     fallbackMessage="メッセージング機能を利用するには電話番号認証が必要です。認証を完了すると会話の送受信が可能になり、20ポイントのボーナスも獲得できます。"
   >
     <div className="container mx-auto px-4 py-6">
       <div className="flex justify-between items-center mb-6">
         <h1 className="text-3xl font-bold flex items-center">
           <MessageCircle className="mr-2 w-8 h-8 text-indigo-600" />
           メッセージ
         </h1>
         
         {/* 認証情報とプレミアム情報 */}
         <div className="flex items-center space-x-4">
           {verificationState?.level >= VerificationLevel.PHONE_VERIFIED && (
             <div className="flex items-center text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">
               <Shield className="w-4 h-4 mr-1" />
               <span>認証済み</span>
             </div>
           )}
           
           {isPremium && (
             <div className="flex items-center text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
               <Award className="w-4 h-4 mr-1" />
               <span>プレミアム会員</span>
             </div>
           )}
         </div>
       </div>

       {/* 認証済みでも非プレミアム会員へのアップグレード案内 */}
       {verificationState?.level >= VerificationLevel.PHONE_VERIFIED && !isPremium && (
         <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm">
           <div className="flex items-start">
             <AlertTriangle className="w-5 h-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" />
             <div>
               <p className="text-indigo-800">
                 メッセージ送信には1ポイント必要です。プレミアム会員になると無制限にメッセージを送信できます。
               </p>
               <div className="mt-2">
                 <button
                   onClick={() => navigate('/premium')}
                   className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
                 >
                   プレミアム会員になる
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* モバイル表示用のタブ切り替え */}
       {isMobile && (
         <div className="flex mb-4 bg-white rounded-lg shadow-sm overflow-hidden">
           <button
             onClick={() => {
               setShowList(true);
               navigate('/messages');
             }}
             className={`flex-1 py-3 flex justify-center items-center ${
               showList ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-gray-600'
             }`}
           >
             <Inbox className="w-5 h-5 mr-2" />
             会話一覧
           </button>
           <button
             onClick={() => setShowList(false)}
             disabled={!selectedConversationId}
             className={`flex-1 py-3 flex justify-center items-center ${
               !showList && selectedConversationId
                 ? 'bg-indigo-100 text-indigo-800'
                 : 'bg-white text-gray-600'
             } ${!selectedConversationId ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
             <Users className="w-5 h-5 mr-2" />
             メッセージ
           </button>
         </div>
       )}

       <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-6`}>
         {/* 会話一覧（モバイルでは条件付き表示） */}
         {(!isMobile || showList) && (
           <div className={`${isMobile ? 'w-full' : 'w-1/3'}`}>
             <MessageList
               onSelectConversation={handleSelectConversation}
               selectedConversationId={selectedConversationId || undefined}
             />
           </div>
         )}

         {/* 会話詳細（モバイルでは条件付き表示） */}
         {(!isMobile || !showList) && (
           <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
             {selectedConversationId ? (
               <div>
                 {isMobile && (
                   <button
                     onClick={handleBackToList}
                     className="mb-4 px-4 py-2 bg-gray-100 text-gray-800 rounded-md flex items-center hover:bg-gray-200 transition-colors"
                   >
                     <svg
                       xmlns="http://www.w3.org/2000/svg"
                       className="h-5 w-5 mr-2"
                       viewBox="0 0 20 20"
                       fill="currentColor"
                     >
                       <path
                         fillRule="evenodd"
                         d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 010 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                         clipRule="evenodd"
                       />
                     </svg>
                     会話一覧に戻る
                   </button>
                 )}
                 <ConversationView conversationId={selectedConversationId} />
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-96 bg-white rounded-lg shadow-sm p-6 text-center">
                 <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                 <h3 className="text-xl font-semibold text-gray-800 mb-2">
                   会話を選択してください
                 </h3>
                 <p className="text-gray-600 mb-6">
                   左側のリストから会話を選択するか、新しい会話を始めてください
                 </p>
                 <button
                   onClick={() => navigate('/matching')}
                   className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                 >
                   マッチングを探す
                 </button>
               </div>
             )}
           </div>
         )}
       </div>
     </div>
   </VerificationGuard>
 );
};

export default MessagingPage;