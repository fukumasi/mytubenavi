// src/components/layout/NotificationBell.tsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Crown, Star, ChevronRight, Clock, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification, NotificationType } from '@/types/notification';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface NotificationBellProps {}

export default function NotificationBell({}: NotificationBellProps) {
  const { 
    unreadCount, 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    getImportantNotifications,
    premiumNotificationsCount,
    executeNotificationAction
  } = useNotifications();
  const { isPremium } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [processingActions, setProcessingActions] = useState<Record<string, boolean>>({});
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

    // 接続リクエスト通知の場合は、クリックしてもドロップダウンを閉じない
    if (notification.type !== 'connection_request') {
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    await markAllAsRead();
  };

  // 通知アクション（承認/拒否など）を実行
  const handleAction = async (e: React.MouseEvent, notification: Notification, actionType: 'accept' | 'reject') => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setProcessingActions(prev => ({ ...prev, [notification.id]: true }));
      
      // 接続IDを取得
      const connectionId = notification.metadata?.connection_data?.connection_id;
      if (!connectionId) {
        toast.error('接続情報が不足しています');
        return;
      }
      
      // useNotifications フックの executeNotificationAction を使用
      const result = await executeNotificationAction(
        notification.id,
        {
          id: `action-${actionType}-${Date.now()}`,
          label: actionType === 'accept' ? '承認' : '拒否',
          type: actionType,
          payload: { connectionId }
        }
      );
      
      if (result.success) {
        const actionVerb = actionType === 'accept' ? '承認' : '拒否';
        toast.success(`リクエストを${actionVerb}しました`);
        
        // リダイレクトURLがある場合（例：メッセージページへ）
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('通知アクション実行エラー:', error);
      toast.error('操作に失敗しました。後でもう一度お試しください。');
    } finally {
      setProcessingActions(prev => ({ ...prev, [notification.id]: false }));
    }
  };

  // 表示する通知をフィルタリング（非プレミアム会員は重要・標準の通知のみ）
  const filteredNotifications = isPremium 
    ? notifications 
    : getImportantNotifications(10); // 非プレミアム会員は重要な通知のみ10件まで表示

  const getNotificationIcon = (type: NotificationType) => {
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
      // 接続関連の通知アイコン
      case 'connection_request':
        return '🤝';
      case 'connection_accepted':
        return '✅';
      case 'connection_rejected':
        return '❌';
      case 'match':
        return '🔥';
      // その他の通知タイプ
      case 'matching':
        return '🤝';
      case 'message':
        return '📩';
      case 'mention':
        return '🗣️';
      default:
        return '📝';
    }
  };

  // 通知種別に応じたクラスを返す
  const getNotificationClass = (notification: Notification) => {
    // premium_only は型定義にないので、メッセージの内容で判定
    const isPremiumRelated = notification.message && notification.message.toLowerCase().includes('プレミアム');
    
    if (isPremiumRelated) {
      return 'bg-yellow-50 border-l-4 border-yellow-400';
    }
    
    if (notification.priority === 'high') {
      return notification.is_read 
        ? 'bg-red-50 bg-opacity-50' 
        : 'bg-red-50 border-l-4 border-red-400';
    }
    
    if (notification.type === 'connection_request') {
      return notification.is_read
        ? 'bg-blue-50 bg-opacity-50'
        : 'bg-blue-50 border-l-4 border-blue-500';
    }
    
    if (notification.type === 'connection_accepted') {
      return notification.is_read
        ? 'bg-green-50 bg-opacity-50'
        : 'bg-green-50 border-l-4 border-green-500';
    }
    
    if (notification.type === 'connection_rejected') {
      return notification.is_read
        ? 'bg-gray-50 bg-opacity-50'
        : 'bg-gray-50 border-l-4 border-gray-500';
    }
    
    return notification.is_read ? 'bg-white' : 'bg-blue-50 border-l-4 border-blue-400';
  };

  // 優先度に応じたバッジを取得
  const getPriorityBadge = (notification: Notification) => {
    if (notification.priority === 'high') {
      return (
        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex items-center">
          <Star className="h-3 w-3 mr-1" />
          重要
        </span>
      );
    }
    
    // premium_only は型定義にないので、メッセージの内容で判定
    const isPremiumRelated = notification.message && notification.message.toLowerCase().includes('プレミアム');
    if (isPremiumRelated) {
      return (
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex items-center">
          <Crown className="h-3 w-3 mr-1" />
          プレミアム
        </span>
      );
    }
    
    if (notification.type === 'connection_request') {
      return (
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center">
          <UserPlus className="h-3 w-3 mr-1" />
          接続リクエスト
        </span>
      );
    }
    
    return null;
  };

  // 接続リクエストの通知コンテンツをレンダリング
  const renderConnectionRequestContent = (notification: Notification) => {
    const isProcessing = processingActions[notification.id] || false;
    const metadata = notification.metadata;
    const connectionData = metadata?.connection_data;
    
    if (!connectionData || !connectionData.action_required) {
      return (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {notification.message}
        </p>
      );
    }
    
    return (
      <>
        <p className="text-sm text-gray-500 mt-1 mb-2">
          {notification.message}
        </p>
        <div className="flex justify-between gap-2 mt-2">
          <button
            disabled={isProcessing}
            onClick={(e) => handleAction(e, notification, 'accept')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded text-xs flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="animate-pulse">処理中...</span>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-1" /> 承認する
              </>
            )}
          </button>
          <button
            disabled={isProcessing}
            onClick={(e) => handleAction(e, notification, 'reject')}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-1 px-2 rounded text-xs flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="animate-pulse">処理中...</span>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" /> 拒否する
              </>
            )}
          </button>
        </div>
      </>
    );
  };

  // 通知種別に応じたコンテンツをレンダリング
  const renderNotificationContent = (notification: Notification) => {
    if (notification.type === 'connection_request') {
      return renderConnectionRequestContent(notification);
    }
    
    return (
      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
        {notification.message}
      </p>
    );
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
                        {notification.message && notification.message.toLowerCase().includes('プレミアム') && (
                          <span className="ml-2">
                            <Crown className="h-4 w-4 text-yellow-500" />
                          </span>
                        )}
                      </div>
                      {renderNotificationContent(notification)}
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