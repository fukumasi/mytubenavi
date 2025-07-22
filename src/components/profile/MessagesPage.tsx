// src/components/profile/MessagesPage.tsx

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import useMessaging from '@/hooks/useMessaging';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function MessagesPage() {
  const {
    conversations,
    loading,
    error,
    fetchConversations,
  } = useMessaging();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        エラーが発生しました: {error}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        まだメッセージがありません。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversations.map((conv) => (
        <Link
          key={conv.id}
          to={`/messages/${conv.id}`}
          className="flex items-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition relative"
        >
          <img
            src={conv.otherUser?.avatar_url || '/default-avatar.jpg'}
            alt="avatar"
            className="w-12 h-12 rounded-full mr-4 object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-indigo-600' : ''}`}>
              {conv.otherUser?.username || '不明ユーザー'}
            </div>
          </div>
          <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">
            {conv.last_message_time
              ? formatDistanceToNow(new Date(conv.last_message_time), {
                  addSuffix: true,
                  locale: ja,
                })
              : ''}
          </div>

          {/* 未読メッセージバッジ */}
          {conv.unread_count > 0 && (
            <span className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"></span>
          )}
        </Link>
      ))}
    </div>
  );
}
