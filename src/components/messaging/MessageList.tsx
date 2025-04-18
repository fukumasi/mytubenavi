// src/components/messaging/MessageList.tsx

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Crown, User, Search, MessageCircle, Shield, Award, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import useMessaging from '@/hooks/useMessaging';
import { VerificationLevel } from '@/services/verificationService';

interface MessageListProps {
  onSelectConversation?: (conversationId: string) => void;
  selectedConversationId?: string;
}

const MessageList: React.FC<MessageListProps> = ({ 
  onSelectConversation, 
  selectedConversationId 
}) => {
  const { user, isPremium } = useAuth();
  const { conversations, loading, error, fetchConversations, verificationState } = useMessaging();
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 検索フィルター
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      conv.otherUser.username.toLowerCase().includes(query) ||
      (conv.last_message?.content.toLowerCase().includes(query))
    );
  });

  // 会話をクリックした時のハンドラー
  const handleConversationClick = (conversationId: string) => {
    if (onSelectConversation) {
      onSelectConversation(conversationId);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <MessageCircle className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">メッセージ機能を利用するにはログインが必要です</p>
        <Link 
          to="/login" 
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          ログインする
        </Link>
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
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchConversations}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* ステータスバー */}
      <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center">
          <MessageCircle className="w-5 h-5 text-indigo-600 mr-2" />
          <span className="text-sm font-medium text-gray-700">メッセージ一覧</span>
        </div>
        <div className="flex space-x-2">
          {verificationState?.level >= VerificationLevel.PHONE_VERIFIED && (
            <div className="flex items-center text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3 mr-1" />
              <span>認証済み</span>
            </div>
          )}
          {isPremium && (
            <div className="flex items-center text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
              <Award className="w-3 h-3 mr-1" />
              <span>プレミアム</span>
            </div>
          )}
        </div>
      </div>

      {/* 検索バー */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="会話を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 会話リスト */}
      <div className="divide-y max-h-[550px] overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            {searchQuery.trim() ? (
              <p>検索条件に一致する会話はありません</p>
            ) : (
              <div>
                <p className="mb-2">会話がまだありません</p>
                <p className="text-sm text-gray-400">マッチングからメッセージを始めましょう</p>
                <Link 
                  to="/matching" 
                  className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  マッチングを探す
                </Link>
              </div>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleConversationClick(conversation.id)}
              className={`p-4 flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversationId === conversation.id ? 'bg-indigo-50' : ''
              }`}
            >
              {/* ユーザーアバター */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {conversation.otherUser.avatar_url ? (
                    <img
                      src={conversation.otherUser.avatar_url}
                      alt={conversation.otherUser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* ユーザーステータスバッジ（複数表示） */}
                <div className="absolute -right-1 -bottom-1 flex space-x-0.5">
                  {/* プレミアム会員バッジ */}
                  {conversation.otherUser.is_premium && (
                    <span className="bg-yellow-400 rounded-full p-1">
                      <Crown className="w-3 h-3 text-white" />
                    </span>
                  )}
                  
                  {/* 認証バッジ（データが存在する場合のみ表示） */}
                  {conversation.otherUser.verification_level !== undefined && 
                   conversation.otherUser.verification_level >= VerificationLevel.PHONE_VERIFIED && (
                    <span className="bg-green-500 rounded-full p-1">
                      <Shield className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                
                {/* 未読バッジ */}
                {conversation.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                  </span>
                )}
              </div>

              {/* 会話情報 */}
              <div className="ml-4 flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {conversation.otherUser.username}
                  </h3>
                  {conversation.last_message && (
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                        addSuffix: true,
                        locale: ja
                      })}
                    </span>
                  )}
                </div>
                
                <div className="mt-1 flex items-center">
                  {/* ハイライトされたメッセージの場合は星アイコンを表示 */}
                  {conversation.last_message?.is_highlighted && (
                    <Star className="w-3 h-3 text-yellow-500 mr-1 flex-shrink-0" />
                  )}
                  
                  <p className={`text-sm truncate ${
                    conversation.unread_count > 0
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-500'
                  } ${
                    conversation.last_message?.is_highlighted ? 'text-yellow-700 bg-yellow-50 px-1 rounded' : ''
                  }`}>
                    {conversation.last_message
                      ? conversation.last_message.sender_id === user.id
                        ? `あなた: ${conversation.last_message.content}`
                        : conversation.last_message.content
                      : '（まだメッセージはありません）'}
                  </p>
                  
                  {/* 既読マーク（自分のメッセージが相手に既読された場合） */}
                  {conversation.last_message && 
                   conversation.last_message.sender_id === user.id && 
                   conversation.last_message.is_read && (
                    <span className="ml-2 text-xs text-blue-500">
                      既読
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* プレミアム会員へのプロモーション */}
      {!isPremium && verificationState?.level >= VerificationLevel.PHONE_VERIFIED && (
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-t">
          <div className="flex items-center">
            <Crown className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                プレミアム会員になると、メッセージ送信が無制限！
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                ハイライトメッセージやプロフィール優先表示など特典も多数
              </p>
            </div>
            <Link
              to="/premium"
              className="ml-auto px-3 py-1.5 text-xs bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors whitespace-nowrap"
            >
              詳細を見る
            </Link>
          </div>
        </div>
      )}
      
      {/* 電話番号認証が必要な場合のプロモーション */}
      {verificationState?.level < VerificationLevel.PHONE_VERIFIED && !verificationState?.loading && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-t">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">
                電話番号認証でメッセージを送受信できるようになります
              </p>
              <p className="text-xs text-green-700 mt-1">
                認証完了で20ポイントのボーナスも！
              </p>
            </div>
            <Link
              to="/profile/verification"
              className="ml-auto px-3 py-1.5 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors whitespace-nowrap"
            >
              今すぐ認証
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;