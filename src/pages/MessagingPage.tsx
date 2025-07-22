import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MessageList from '../components/profile/messaging/MessageList';
import ConversationView from '../components/profile/messaging/ConversationView';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MessageCircle, Inbox, Users } from 'lucide-react';
import useMessaging from '../hooks/useMessaging';
import VerificationGuard from '../components/matching/VerificationGuard';
import { VerificationLevel } from '../services/verificationService';

const MessagingPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { setCurrentConversation } = useMessaging();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showList, setShowList] = useState<boolean>(true);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userIdParam = params.get('user_id');
    if (userIdParam) {
      setOtherUserId(userIdParam);
      if (isMobile) setShowList(false);
    } else {
      setOtherUserId(null);
    }
  }, [location.search, isMobile]);

  useEffect(() => {
    if (conversationId) {
      setSelectedConversationId(conversationId);
      setCurrentConversation(conversationId);
      setOtherUserId(null);
      if (isMobile) setShowList(false);
    } else {
      setSelectedConversationId(null);
      setCurrentConversation(null);
      setOtherUserId(null);
      setShowList(true);
    }
  }, [conversationId, otherUserId, isMobile, setCurrentConversation]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setCurrentConversation(id);
    setOtherUserId(null);
    navigate(`/messages/${id}`);
    if (isMobile) setShowList(false);
  };

  const handleBackToList = () => {
    setShowList(true);
    setOtherUserId(null);
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
          <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-text-primary mb-2">
            メッセージングを利用するにはログインが必要です
          </h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
            アカウントを作成するか、ログインしてください
          </p>
          <div className="flex space-x-4">
            <button onClick={() => navigate('/login')} className="px-6 py-2 bg-indigo-600 text-white rounded-md">
              ログイン
            </button>
            <button onClick={() => navigate('/signup')} className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-md">
              アカウント作成
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VerificationGuard requiredLevel={VerificationLevel.PHONE_VERIFIED}>
      <div className="container mx-auto px-4 py-6">

        <div className="flex w-full mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-2 shadow-sm">
          <button
            onClick={() => {
              setShowList(true);
              setOtherUserId(null);
              navigate('/messages');
            }}
            className={`flex-1 py-3 min-h-[48px] flex justify-center items-center rounded-md transition-colors duration-200 ${
              showList
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Inbox className="w-5 h-5 mr-2" />
            会話一覧
          </button>
          <button
            onClick={() => setShowList(false)}
            className={`flex-1 py-3 min-h-[48px] flex justify-center items-center rounded-md transition-colors duration-200 ${
              !showList
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Users className="w-5 h-5 mr-2" />
            メッセージ
          </button>
        </div>

        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-6`}>
          {(!isMobile || showList) && (
            <div className={`${isMobile ? 'w-full' : 'w-1/3'}`}>
              <MessageList onSelectConversation={handleSelectConversation} selectedConversationId={selectedConversationId || undefined} />
            </div>
          )}
          {(!isMobile || !showList) && (
            <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
              {selectedConversationId || otherUserId ? (
                <div>
                  {isMobile && (
                    <button onClick={handleBackToList} className="mb-4 px-4 py-2 bg-gray-100 text-gray-800 rounded-md">
                      ← 会話一覧に戻る
                    </button>
                  )}
                  {selectedConversationId ? (
                    <ConversationView conversationId={selectedConversationId} />
                  ) : (
                    <ConversationView otherUserId={otherUserId || undefined} />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6 text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold">会話を選択してください</h3>
                  <p className="text-gray-600">リストから会話を選択してください</p>
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