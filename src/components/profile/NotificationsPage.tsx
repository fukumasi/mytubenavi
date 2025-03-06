// src/components/profile/NotificationsPage.tsx

import { useState } from 'react';
import { Bell, MessageSquare, Star, Heart, Trash2, Check, UserPlus } from 'lucide-react';
import ProfileLayout from './ProfileLayout';
import { useNotifications } from '../../hooks/useNotifications';
import { Notification, NotificationType } from '../../types/notification';

// 有効な NotificationType を確保するための型拡張
type NotificationFilterType = 'system' | 'new_video' | 'video_comment' | 'review_reply' | 'like' | 'follow' | 'all';

interface FilterOption {
  value: NotificationFilterType;
  label: string;
  icon: JSX.Element;
}

const filterOptions: FilterOption[] = [
  { value: 'all', label: 'すべて', icon: <Bell className="h-4 w-4" /> },
  { value: 'video_comment', label: 'コメント', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'review_reply', label: '返信', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'like', label: 'いいね', icon: <Heart className="h-4 w-4" /> },
  { value: 'follow', label: 'フォロー', icon: <UserPlus className="h-4 w-4" /> }
];

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete 
}: { 
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (notification.is_read) return;
    
    setIsUpdating(true);
    try {
      await onMarkAsRead(notification.id);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('この通知を削除してもよろしいですか？')) return;
    
    setIsDeleting(true);
    try {
      await onDelete(notification.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`
        p-4 rounded-lg hover:shadow-md transition-all duration-200
        ${notification.is_read ? 'bg-white' : 'bg-blue-50'}
        ${notification.priority === 'high' ? 'border-l-4 border-red-500' : ''}
        ${isDeleting ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {getNotificationIcon(notification.type)}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">
            {notification.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">
              {new Date(notification.created_at).toLocaleString('ja-JP')}
            </p>
            <div className="flex items-center gap-2">
              {!notification.is_read && (
                <button
                  onClick={handleMarkAsRead}
                  disabled={isUpdating}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  既読
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'video_comment':
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case 'review_reply':
      return <MessageSquare className="h-5 w-5 text-green-500" />;
    case 'like':
      return <Heart className="h-5 w-5 text-red-500" />;
    case 'follow':
      return <UserPlus className="h-5 w-5 text-purple-500" />;
    case 'new_video':
      return <Bell className="h-5 w-5 text-purple-500" />;
    case 'review_mention':
      return <MessageSquare className="h-5 w-5 text-orange-500" />;
    case 'rating':
      return <Star className="h-5 w-5 text-yellow-500" />;
    case 'favorite':
      return <Heart className="h-5 w-5 text-pink-500" />;
    case 'system':
      return <Bell className="h-5 w-5 text-blue-700" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

export default function NotificationsPage() {
  const { 
    notifications, 
    loading, 
    error,
    markAsRead, 
    markAllAsRead,
    deleteNotification
  } = useNotifications();
  
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilterType>('all');
  const [isClearing, setIsClearing] = useState(false);

  const filteredNotifications = selectedFilter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === selectedFilter);

  const handleDeleteNotification = async (id: string): Promise<void> => {
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error('通知の削除に失敗しました:', err);
      alert('通知の削除に失敗しました。再度お試しください。');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('既読の通知をすべて削除してもよろしいですか？')) return;
    
    setIsClearing(true);
    try {
      // 既読の通知をすべて削除する処理
      const readNotifications = notifications.filter(n => n.is_read);
      await Promise.all(readNotifications.map(n => handleDeleteNotification(n.id)));
    } finally {
      setIsClearing(false);
    }
  };

  if (loading) {
    return (
      <ProfileLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">通知一覧</h2>
          <div className="flex items-center gap-4">
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={() => markAllAsRead()}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                すべて既読にする
              </button>
            )}
            {notifications.some(n => n.is_read) && (
              <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                既読の通知を削除
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedFilter(option.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm
                ${selectedFilter === option.value
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <p className="text-center text-gray-500 py-8">通知はありません</p>
          ) : (
            filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={handleDeleteNotification}
              />
            ))
          )}
        </div>
      </div>
    </ProfileLayout>
  );
}