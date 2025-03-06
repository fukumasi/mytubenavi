// src/components/profile/NotificationList.tsx

import { Bell, MessageSquare, Star, Heart, Trophy, UserPlus, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import ProfileLayout from './ProfileLayout';
import { Notification, NotificationType } from '../../types/notification';

interface NotificationIconProps {
  type: NotificationType;
}

function NotificationIcon({ type }: NotificationIconProps) {
  // 正確な NotificationType の値に基づいてアイコンを設定
  const icons: Record<string, JSX.Element> = {
    'video_comment': <MessageSquare className="h-5 w-5" />,
    'review_reply': <MessageSquare className="h-5 w-5" />,
    'like': <Heart className="h-5 w-5" />,
    'follow': <UserPlus className="h-5 w-5" />,
    'system': <Bell className="h-5 w-5" />,
    'new_video': <Bell className="h-5 w-5" />,
    'review_mention': <MessageSquare className="h-5 w-5" />,
    'rating': <Star className="h-5 w-5" />,
    'favorite': <Heart className="h-5 w-5" />,
    'mention': <MessageSquare className="h-5 w-5" />,
    'achievement': <Trophy className="h-5 w-5" />,
    'recommendation': <TrendingUp className="h-5 w-5" />,
    'milestone': <Trophy className="h-5 w-5" />,
    'subscription': <UserPlus className="h-5 w-5" />
  };

  return <div className="text-gray-500">{icons[type] || <Bell className="h-5 w-5" />}</div>;
}

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onClick: (notification: Notification) => void;
}

const NotificationItem = ({ notification, onRead, onClick }: NotificationItemProps) => (
  <div
    onClick={() => {
      onRead(notification.id);
      onClick(notification);
    }}
    className={`
      p-4 rounded-lg cursor-pointer transition-colors
      ${!notification.is_read ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-gray-50'}
    `}
  >
    <div className="flex items-start space-x-4">
      <NotificationIcon type={notification.type} />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900">
          {notification.title}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(notification.created_at).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
      {notification.priority === 'high' && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          重要
        </span>
      )}
    </div>
  </div>
);

export default function NotificationList() {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const unreadNotifications = notifications.filter(n => !n.is_read);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.metadata?.video_id) {
      navigate(`/video/${notification.metadata.video_id}`);
    } else if (notification.source_id && notification.source_type === 'video') {
      navigate(`/video/${notification.source_id}`);
    } else if (notification.link) {
      navigate(notification.link);
    }

    if (!notification.action_taken && notification.type !== 'new_video') {
      handleRequiredAction(notification);
    }
  };

  const handleRequiredAction = async (notification: Notification) => {
    switch (notification.type) {
      case 'follow':
      case 'mention':
      case 'review_mention':
        // アクション処理
        break;
      default:
        break;
    }
  };

  return (
    <ProfileLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-gray-900">通知</h2>
            {unreadNotifications.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {unreadNotifications.length}
              </span>
            )}
          </div>
          {unreadNotifications.length > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              すべて既読にする
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">通知はありません</h3>
            <p className="mt-1 text-sm text-gray-500">新しい通知が届くとここに表示されます。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </div>
    </ProfileLayout>
  );
}