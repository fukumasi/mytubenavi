// src/components/profile/NotificationsPage.tsx

import { useState, useCallback, useMemo } from 'react';
import { Bell, MessageSquare, Star, Heart, Trash2, Check, UserPlus, Users, Calendar, Filter, XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ProfileLayout from './ProfileLayout';
import { useNotifications } from '../../hooks/useNotifications';
import { Notification, NotificationType } from '../../types/notification';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// 有効な NotificationType を確保するための型拡張
type NotificationFilterType = NotificationType | 'all' | 'connection_related';

// ローカルアクション型
type ActionType = 'accept' | 'reject';

interface FilterOption {
  value: NotificationFilterType;
  label: string;
  icon: JSX.Element;
  premiumOnly?: boolean;
}

const filterOptions: FilterOption[] = [
  { value: 'all', label: 'すべて', icon: <Bell className="h-4 w-4" /> },
  { value: 'connection_related', label: '接続リクエスト', icon: <Users className="h-4 w-4" /> },
  { value: 'matching', label: 'マッチング', icon: <Users className="h-4 w-4" /> },
  { value: 'message', label: 'メッセージ', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'video_comment', label: 'コメント', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'review_reply', label: '返信', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'like', label: 'いいね', icon: <Heart className="h-4 w-4" /> },
  { value: 'follow', label: 'フォロー', icon: <UserPlus className="h-4 w-4" /> },
  { value: 'system', label: 'システム', icon: <Bell className="h-4 w-4" /> },
  { value: 'new_video', label: '新着動画', icon: <Bell className="h-4 w-4" />, premiumOnly: true },
  { value: 'achievement', label: '達成', icon: <Star className="h-4 w-4" />, premiumOnly: true },
];

// 日付でのフィルタリング用オプション
type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';

interface DateFilterOption {
  value: DateFilterType;
  label: string;
}

const dateFilterOptions: DateFilterOption[] = [
  { value: 'all', label: 'すべての期間' },
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'week', label: '1週間以内' },
  { value: 'month', label: '1ヶ月以内' },
];

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  onExecuteAction 
}: { 
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExecuteAction: (id: string, action: ActionType) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState<ActionType | null>(null);

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

  const handleAction = async (e: React.MouseEvent, action: ActionType) => {
    e.preventDefault();
    e.stopPropagation();

    setIsProcessingAction(action);
    try {
      await onExecuteAction(notification.id, action);
    } finally {
      setIsProcessingAction(null);
    }
  };

  const isConnectionRequest = notification.type === 'connection_request';
  const showActionButtons = isConnectionRequest && notification.metadata?.connection_data?.action_required;

  return (
    <div
      className={`
        p-4 rounded-lg hover:shadow-md transition-all duration-200
        ${notification.is_read ? 'bg-white' : 'bg-blue-50'}
        ${notification.priority === 'high' ? 'border-l-4 border-red-500' : ''}
        ${notification.type === 'connection_request' && !notification.is_read ? 'border-l-4 border-blue-500' : ''}
        ${notification.type === 'connection_accepted' && !notification.is_read ? 'border-l-4 border-green-500' : ''}
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
          
          {/* 接続リクエストの場合はアクションボタンを表示 */}
          {showActionButtons && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={(e) => handleAction(e, 'accept')}
                disabled={isProcessingAction !== null}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingAction === 'accept' ? (
                  <span className="animate-pulse">処理中...</span>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" /> 承認する
                  </>
                )}
              </button>
              <button
                onClick={(e) => handleAction(e, 'reject')}
                disabled={isProcessingAction !== null}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-1 px-3 rounded text-sm flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingAction === 'reject' ? (
                  <span className="animate-pulse">処理中...</span>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" /> 拒否する
                  </>
                )}
              </button>
            </div>
          )}
          
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
    case 'message':
      return <MessageSquare className="h-5 w-5 text-indigo-500" />;
    case 'matching':
      return <Users className="h-5 w-5 text-indigo-600" />;
    case 'connection_request':
      return <UserPlus className="h-5 w-5 text-blue-600" />;
    case 'connection_accepted':
      return <Users className="h-5 w-5 text-green-600" />;
    case 'system':
      return <Bell className="h-5 w-5 text-blue-700" />;
    case 'achievement':
      return <Star className="h-5 w-5 text-amber-500" />;
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
    deleteNotification,
    executeNotificationAction
  } = useNotifications();
  
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilterType>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterType>('all');
  const [isClearing, setIsClearing] = useState(false);

  // 接続関連通知のフィルタリング処理
  const isConnectionRelated = useCallback((notification: Notification) => {
    return ['connection_request', 'connection_accepted'].includes(notification.type);
  }, []);

  // 日付でのフィルタリング処理
  const filterByDate = useCallback((notification: Notification) => {
    const notifDate = new Date(notification.created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    switch (selectedDateFilter) {
      case 'today':
        return notifDate >= today;
      case 'yesterday':
        return notifDate >= yesterday && notifDate < today;
      case 'week':
        return notifDate >= weekAgo;
      case 'month':
        return notifDate >= monthAgo;
      default:
        return true;
    }
  }, [selectedDateFilter]);

  // 通知のフィルタリング処理
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];
    
    // タイプでフィルタリング
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'connection_related') {
        filtered = filtered.filter(isConnectionRelated);
      } else {
        filtered = filtered.filter(n => n.type === selectedFilter);
      }
    }
    
    // 日付でフィルタリング
    filtered = filtered.filter(filterByDate);
    
    return filtered;
  }, [notifications, selectedFilter, filterByDate, isConnectionRelated]);

  const handleDeleteNotification = async (id: string): Promise<void> => {
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error('通知の削除に失敗しました:', err);
      toast.error('通知の削除に失敗しました。再度お試しください。');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('既読の通知をすべて削除してもよろしいですか？')) return;
    
    setIsClearing(true);
    try {
      // 既読の通知をすべて削除する処理
      const readNotifications = notifications.filter(n => n.is_read);
      await Promise.all(readNotifications.map(n => handleDeleteNotification(n.id)));
      toast.success('既読の通知を削除しました');
    } catch (error) {
      toast.error('通知の削除中にエラーが発生しました');
    } finally {
      setIsClearing(false);
    }
  };

  const handleExecuteAction = async (notificationId: string, actionType: ActionType): Promise<void> => {
    try {
      // NotificationAction オブジェクトを作成
      const action = {
        id: `action_${Date.now()}`,
        label: actionType === 'accept' ? '承認' : '拒否',
        type: actionType,
        primary: actionType === 'accept',
      };
      
      const result = await executeNotificationAction(notificationId, action);
      
      if (result.success) {
        if (actionType === 'accept') {
          toast.success('接続リクエストを承認しました');
          // メッセージページに遷移
          navigate('/messaging');
        } else if (actionType === 'reject') {
          toast.success('接続リクエストを拒否しました');
        }
      } else {
        toast.error(result.error || '操作に失敗しました');
      }
    } catch (error) {
      console.error('接続リクエスト処理エラー:', error);
      toast.error('操作中にエラーが発生しました');
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

  // 表示するフィルターオプションをプレミアム状態に応じてフィルタリング
  const availableFilters = filterOptions.filter(option => !option.premiumOnly || isPremium);

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
                className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                {isClearing ? '処理中...' : '既読の通知を削除'}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* 通知タイプによるフィルタリング */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Filter className="h-4 w-4 mr-1" /> 通知タイプ
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {availableFilters.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedFilter(option.value)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap
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
          </div>

          {/* 日付によるフィルタリング */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" /> 期間
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dateFilterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDateFilter(option.value)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap
                    ${selectedDateFilter === option.value
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        {!isPremium && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start">
            <Star className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-amber-800">プレミアム会員向け機能</h3>
              <p className="text-sm text-amber-700 mt-1">
                プレミアム会員になると、すべての通知タイプの表示やより高度なフィルタリング機能が利用できます。
              </p>
              <button 
                onClick={() => navigate('/premium/upgrade')}
                className="mt-2 text-sm bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded transition-colors"
              >
                アップグレードする
              </button>
            </div>
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
                onExecuteAction={handleExecuteAction}
              />
            ))
          )}
        </div>
      </div>
    </ProfileLayout>
  );
}