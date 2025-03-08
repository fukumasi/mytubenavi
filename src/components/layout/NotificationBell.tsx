// src/components/layout/NotificationBell.tsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Crown, Star, ChevronRight, Clock } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { Notification } from '../../types/notification';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationBellProps {}

export default function NotificationBell({}: NotificationBellProps) {
  const { 
    unreadCount, 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    getImportantNotifications,
    premiumNotificationsCount 
  } = useNotifications();
  const { isPremium } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // プレミアム会員でない場合は、5回目の通知確認後にアップグレード促進を表示
  useEffect(() => {
    if (!isPremium && isOpen) {
      const interactionCount = parseInt(localStorage.getItem('notificationInteractionCount') || '0');
      localStorage.setItem('notificationInteractionCount', (interactionCount + 1).toString());
      
      if (interactionCount >= 4) {
        setShowUpgradePrompt(true);
      }
    }
  }, [isOpen, isPremium]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    await markAllAsRead();
  };

  // 表示する通知をフィルタリング（非プレミアム会員は重要・標準の通知のみ）
  const filteredNotifications = isPremium 
    ? notifications 
    : getImportantNotifications(10); // 非プレミアム会員は重要な通知のみ10件まで表示

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'video_comment':
        return '💬';
      case 'review_reply':
        return '💬';
      case 'like':
        return '👍';
      case 'rating':
        return '⭐';
      case 'favorite':
        return '❤️';
      case 'follow':
        return '👤';
      case 'new_video':
        return '🎥';
      case 'system':
        return '🔔';
      case 'review_mention':
        return '🗣️';
      case 'achievement':
        return '🏆';
      case 'recommendation':
        return '📊';
      case 'milestone':
        return '🎯';
      case 'subscription':
        return '📬';
      // プレミアム対応のためのケースを追加
      case 'premium_feature':
        return '✨';
      case 'premium_benefit':
        return '🎁';
      case 'matching':
        return '🤝';
      default:
        return '📝';
    }
  };

  // 通知種別に応じたクラスを返す
  const getNotificationClass = (notification: any) => {
    if (notification.is_premium_only) {
      return 'bg-yellow-50 border-l-4 border-yellow-400';
    }
    
    if (notification.priority === 'high') {
      return notification.is_read 
        ? 'bg-red-50 bg-opacity-50' 
        : 'bg-red-50 border-l-4 border-red-400';
    }
    
    if (notification.message && notification.message.includes('プレミアム')) {
      return 'bg-yellow-50';
    }
    
    return notification.is_read ? 'bg-white' : 'bg-blue-50 border-l-4 border-blue-400';
  };

  // 優先度に応じたバッジを取得
  const getPriorityBadge = (notification: any) => {
    if (notification.priority === 'high') {
      return (
        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex items-center">
          <Star className="h-3 w-3 mr-1" />
          重要
        </span>
      );
    }
    
    if (notification.is_premium_only) {
      return (
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex items-center">
          <Crown className="h-3 w-3 mr-1" />
          プレミアム
        </span>
      );
    }
    
    return null;
  };

  // ベルアイコンのスタイルを決定
  const getBellStyle = () => {
    if (unreadCount > 0) {
      return isPremium 
        ? 'text-yellow-500 animate-pulse' 
        : 'text-indigo-600 animate-pulse';
    }
    return 'text-gray-600 hover:text-gray-900';
  };

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 focus:outline-none focus:ring-2 focus:ring-offset-2 
          ${isPremium ? 'focus:ring-yellow-500' : 'focus:ring-indigo-500'} rounded-full
          ${getBellStyle()}`}
        aria-label={`通知 ${unreadCount}件`}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className={`absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs 
            font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 
            ${isPremium ? 'bg-yellow-500' : 'bg-red-500'} rounded-full`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl overflow-hidden z-50 border border-gray-200">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">通知</h3>
            <div className="flex items-center space-x-3">
              {isPremium && (
                <span className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                  <Crown className="h-3 w-3 mr-1" />
                  プレミアム
                </span>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className={`text-xs ${isPremium ? 'text-yellow-600 hover:text-yellow-500' : 'text-indigo-600 hover:text-indigo-500'} flex items-center gap-1`}
                >
                  <Check className="h-4 w-4" />
                  すべて既読にする
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[32rem] overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                通知はありません
              </div>
            ) : (
              filteredNotifications.slice(0, isPremium ? 15 : 8).map((notification) => (
                <Link
                  key={notification.id}
                  to={notification.link || '/profile/notifications'}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    block p-4 hover:bg-gray-50 transition-colors duration-150 ease-in-out
                    ${getNotificationClass(notification)}
                    border-b border-gray-100 last:border-b-0
                  `}
                >
                  <div className="flex gap-3">
                    <span className="text-xl" role="img" aria-label={notification.type}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        {notification.is_premium_only && (
                          <span className="ml-2">
                            <Crown className="h-4 w-4 text-yellow-500" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-400 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(notification.created_at).toLocaleString('ja-JP', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric'
                          })}
                        </p>
                        {getPriorityBadge(notification)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* プレミアム会員でなければアップグレード促進メッセージを表示 */}
          {!isPremium && (
            <div className="p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 border-t border-yellow-200">
              {showUpgradePrompt ? (
                <div className="text-yellow-800 text-center">
                  <p className="flex items-center justify-center text-sm font-medium mb-2">
                    <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                    プレミアム会員特典
                  </p>
                  <ul className="text-xs mb-2 space-y-1">
                    <li className="flex items-center justify-center">
                      <Check className="h-3 w-3 mr-1 text-green-500" />
                      すべての通知を受け取れます
                    </li>
                    <li className="flex items-center justify-center">
                      <Check className="h-3 w-3 mr-1 text-green-500" />
                      マッチング機能が使い放題
                    </li>
                    <li className="flex items-center justify-center">
                      <Check className="h-3 w-3 mr-1 text-green-500" />
                      特別なイベント情報をお届け
                    </li>
                  </ul>
                  <Link
                    to="/premium"
                    className="block w-full text-center bg-yellow-500 hover:bg-yellow-600 text-white py-1.5 px-4 rounded text-sm transition duration-150 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    プレミアム会員になる
                  </Link>
                </div>
              ) : (
                <p className="text-yellow-700 text-center flex items-center justify-center text-sm">
                  <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                  プレミアム会員なら{notifications.length - filteredNotifications.length}件の追加通知が見られます
                </p>
              )}
            </div>
          )}

          {/* プレミアム会員は全ての通知を見るリンク */}
          {isPremium && premiumNotificationsCount > 0 && (
            <div className="p-3 bg-yellow-50 border-t border-yellow-100 flex justify-between items-center">
              <span className="text-sm text-yellow-700 flex items-center">
                <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                プレミアム限定通知 {premiumNotificationsCount}件
              </span>
              <Link
                to="/profile/notifications?filter=premium"
                onClick={() => setIsOpen(false)}
                className="text-xs text-yellow-600 hover:text-yellow-500 flex items-center"
              >
                確認する
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          )}

          {/* 全ての通知を見るフッター */}
          <Link
            to="/profile/notifications"
            onClick={() => setIsOpen(false)}
            className={`block p-3 text-center text-sm 
              ${isPremium ? 'text-yellow-600 hover:text-yellow-500' : 'text-indigo-600 hover:text-indigo-500'} 
              bg-gray-50 border-t border-gray-200`}
          >
            すべての通知を見る
          </Link>
        </div>
      )}
    </div>
  );
}