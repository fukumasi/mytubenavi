// src/components/messaging/MessageList.tsx

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Crown, User, Search, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import useMessaging from '../../hooks/useMessaging';

interface MessageListProps {
  onSelectConversation?: (conversationId: string) => void;
  selectedConversationId?: string;
}

const MessageList: React.FC<MessageListProps> = ({ 
  onSelectConversation, 
  selectedConversationId 
}) => {
  const { user, isPremium } = useAuth();
  const { conversations, loading, error, fetchConversations } = useMessaging();
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
      {/* 検索バー */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="会話を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 会話リスト */}
      <div className="divide-y">
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
                {conversation.otherUser.is_premium && (
                  <span className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1">
                    <Crown className="w-3 h-3 text-white" />
                  </span>
                )}
                
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
                  <p className={`text-sm truncate ${
                    conversation.unread_count > 0
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-500'
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
      {!isPremium && (
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-t">
          <div className="flex items-center">
            <Crown className="w-6 h-6 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                プレミアム会員になると、メッセージ送信が無制限！
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                通知優先度アップなど特典も多数
              </p>
            </div>
            <Link
              to="/premium"
              className="ml-auto px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
            >
              詳細を見る
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;