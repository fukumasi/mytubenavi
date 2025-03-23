// src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  Notification,
  NotificationType,
  NotificationPreference
} from '../types/notification';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// NotificationPriorityの型を定義
type NotificationPriority = 'high' | 'medium' | 'low';

// Notification型を拡張して新しいプロパティを追加
interface EnhancedNotification extends Notification {
  priority?: NotificationPriority;
  is_premium_only?: boolean;
}

interface NotificationContextType {
  notifications: EnhancedNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  filterNotifications: (type?: NotificationType, priority?: NotificationPriority) => EnhancedNotification[];
  updateNotificationPreferences: (preferences: Partial<NotificationPreference>) => Promise<void>;
  getPreferences: () => Promise<NotificationPreference | null>;
  hasNewNotifications: boolean;
  groupNotifications: (groupBy: 'type' | 'priority' | 'date') => Record<string, EnhancedNotification[]>;
  getNotificationStats: () => { total: number, unread: number, highPriority: number };
  getPremiumNotifications: () => EnhancedNotification[];
  getImportantNotifications: (limit?: number) => EnhancedNotification[];
  createNotification: (userId: string, type: NotificationType, title: string, message: string, metadata?: any, priority?: NotificationPriority) => Promise<void>;
  getMatchingNotifications: () => EnhancedNotification[];
  getMessageNotifications: () => EnhancedNotification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isPremium } = useAuth();
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  // 通知の優先度順にソートする関数
  const sortByPriority = (notifs: EnhancedNotification[]): EnhancedNotification[] => {
    const priorityValues = { high: 3, medium: 2, low: 1 };
    return [...notifs].sort((a, b) => {
      // 未読を優先
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
      
      // 次に優先度で並べ替え
      const aPriority = a.priority || 'medium';
      const bPriority = b.priority || 'medium';
      
      if (priorityValues[aPriority] !== priorityValues[bPriority]) {
        return priorityValues[bPriority] - priorityValues[aPriority];
      }
      
      // 最後に日付で並べ替え（新しい順）
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id);

      // 非プレミアム会員の場合は重要度の高い通知と特定の種類の通知のみを取得
      if (!isPremium) {
        query = query.or('priority.eq.high,type.eq.system,type.eq.achievement,type.eq.message,type.eq.matching');
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      const notificationsData = data as EnhancedNotification[] || [];
      
      // 通知を優先度でソート
      const sortedNotifications = sortByPriority(notificationsData);
      setNotifications(sortedNotifications);
      
      // 未読通知があるか確認
      const hasUnread = sortedNotifications.some(n => !n.is_read);
      setHasNewNotifications(hasUnread);
    } catch (err) {
      console.error('通知の取得に失敗:', err);
      setError('通知の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user, isPremium]);

  const getPreferences = async () => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      return data as NotificationPreference;
    } catch (err) {
      console.error('通知設定の取得に失敗:', err);
      return null;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
                updated_at: new Date().toISOString()
              }
            : notification
        )
      );

      // 未読通知の状態を更新
      const updatedNotifications = notifications.map(notification =>
        notification.id === id ? { ...notification, is_read: true } : notification
      );
      const stillHasUnread = updatedNotifications.some(n => !n.is_read);
      setHasNewNotifications(stillHasUnread);
    } catch (err) {
      console.error('通知の既読処理に失敗:', err);
      setError('通知の更新に失敗しました');
      throw err;
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (updateError) throw updateError;

      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          updated_at: new Date().toISOString()
        }))
      );

      // すべて既読になったので未読フラグをリセット
      setHasNewNotifications(false);
    } catch (err) {
      console.error('全通知の既読処理に失敗:', err);
      setError('通知の一括更新に失敗しました');
      throw err;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      const updatedNotifications = notifications.filter(notification => notification.id !== id);
      setNotifications(updatedNotifications);

      // 未読通知の状態を更新
      const stillHasUnread = updatedNotifications.some(n => !n.is_read);
      setHasNewNotifications(stillHasUnread);
    } catch (err) {
      console.error('通知の削除に失敗:', err);
      setError('通知の削除に失敗しました');
      throw err;
    }
  };

  const clearNotifications = async () => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true);

      if (deleteError) throw deleteError;

      const remainingNotifications = notifications.filter(notification => !notification.is_read);
      setNotifications(remainingNotifications);

      // 未読通知の状態は変わらない（既読のみ削除）
    } catch (err) {
      console.error('通知のクリアに失敗:', err);
      setError('通知のクリアに失敗しました');
      throw err;
    }
  };

  // 通知をタイプと優先度でフィルタリング
  const filterNotifications = (type?: NotificationType, priority?: NotificationPriority) => {
    let filtered = [...notifications];
    
    if (type) {
      filtered = filtered.filter(notification => notification.type === type);
    }
    
    if (priority) {
      filtered = filtered.filter(notification => notification.priority === priority);
    }
    
    return filtered;
  };

  // 通知をグループ化する関数
  const groupNotifications = (groupBy: 'type' | 'priority' | 'date') => {
    const grouped: Record<string, EnhancedNotification[]> = {};
    
    notifications.forEach(notification => {
      let key = '';
      
      if (groupBy === 'type') {
        key = notification.type || 'other';
      } else if (groupBy === 'priority') {
        key = notification.priority || 'medium';
      } else if (groupBy === 'date') {
        // 日付でグループ化（今日、昨日、今週、それ以前）
        const today = new Date();
        const notifDate = new Date(notification.created_at);
        
        if (notifDate.toDateString() === today.toDateString()) {
          key = '今日';
        } else {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (notifDate.toDateString() === yesterday.toDateString()) {
            key = '昨日';
          } else {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            if (notifDate > weekAgo) {
              key = '今週';
            } else {
              key = 'それ以前';
            }
          }
        }
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(notification);
    });
    
    return grouped;
  };

  // 通知の統計情報を取得
  const getNotificationStats = () => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    const highPriority = notifications.filter(n => n.priority === 'high').length;
    
    return { total, unread, highPriority };
  };

  // プレミアム会員限定の通知を取得
  const getPremiumNotifications = () => {
    return notifications.filter(n => n.is_premium_only === true);
  };

  // 重要な通知を取得（非プレミアム会員向け）
  const getImportantNotifications = (limit?: number) => {
    const important = notifications.filter(n => 
      n.priority === 'high' || 
      n.type === 'system' || 
      n.type === 'achievement'
    );
    
    // 優先度でソート
    const sorted = sortByPriority(important);
    
    return limit ? sorted.slice(0, limit) : sorted;
  };

  // マッチング関連の通知を取得
  const getMatchingNotifications = () => {
    return notifications.filter(n => n.type === 'matching');
  };

  // メッセージ関連の通知を取得
  const getMessageNotifications = () => {
    return notifications.filter(n => n.type === 'message');
  };

  // 新しい通知を作成する関数
  const createNotification = async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: any,
    priority: NotificationPriority = 'medium'
  ) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          is_read: false,
          metadata,
          priority,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (err) {
      console.error('通知の作成に失敗:', err);
      throw err;
    }
  };

  const updateNotificationPreferences = async (newPreferences: Partial<NotificationPreference>) => {
    if (!user) return;

    try {
      // まず設定が存在するか確認
      const { data: existingPrefs } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const timestamp = new Date().toISOString();
      
      if (existingPrefs) {
        // 既存の設定を更新
        const { error: updateError } = await supabase
          .from('notification_preferences')
          .update({
            ...newPreferences,
            updated_at: timestamp
          })
          .eq('id', existingPrefs.id);

        if (updateError) throw updateError;
      } else {
        // 新規設定を作成
        const defaultPreferences = {
          user_id: user.id,
          video_comments: true,
          review_replies: true,
          likes: true,
          follows: true,
          system_notifications: true,
          new_videos: true,
          ratings: true,
          favorites: true,
          mentions: true,
          achievements: true,
          recommendations: true,
          milestones: true,
          subscriptions: true,
          premium_features: isPremium, // プレミアム関連通知の設定
          matching_notifications: true, // マッチング通知を追加
          message_notifications: true, // メッセージ通知を追加
          email_notifications: false,
          push_notifications: true,
          in_app_notifications: true,
          created_at: timestamp,
          updated_at: timestamp
        };

        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            ...defaultPreferences,
            ...newPreferences
          });

        if (insertError) throw insertError;
      }

      // 設定を再取得するが、ステート更新はしない
      await getPreferences();
    } catch (err) {
      console.error('通知設定の更新に失敗:', err);
      setError('通知設定の更新に失敗しました');
      throw err;
    }
  };

  useEffect(() => {
    // 認証状態やプレミアム状態が変わったらチャンネルとデータをリセット
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
    }
    
    if (!user) {
      setNotifications([]);
      setHasNewNotifications(false);
      setLoading(false);
      return;
    }

    const setupNotificationChannel = async () => {
      if (!user) return;

      const newChannel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            const eventType = payload.eventType;
            
            if (eventType === 'INSERT') {
              // 新しい通知が来たらフラグを立てる
              setHasNewNotifications(true);
              
              // 新しい通知の内容を取得
              if (payload.new && typeof payload.new === 'object') {
                const newNotification = payload.new as EnhancedNotification;
                
                // NotificationSoundコンポーネントでの再生のために
                // 新しい通知のイベントをディスパッチ
                const notificationEvent = new CustomEvent('newNotification', {
                  detail: {
                    notification: newNotification,
                    isPremium
                  }
                });
                window.dispatchEvent(notificationEvent);
              }
            }
            
            // リアルタイム更新を反映
            await fetchNotifications();
          }
        )
        .subscribe();

      setChannel(newChannel);
    };

    setupNotificationChannel();
    fetchNotifications();
    getPreferences();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, isPremium, fetchNotifications]);

  // プレミアム会員状態が変わった時に通知を再取得
  useEffect(() => {
    // プレミアム状態が変わったら通知を再取得
    if (user) {
      fetchNotifications();
    }
  }, [isPremium, user, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    deleteNotification,
    clearNotifications,
    filterNotifications,
    updateNotificationPreferences,
    getPreferences,
    hasNewNotifications,
    groupNotifications,
    getNotificationStats,
    getPremiumNotifications,
    getImportantNotifications,
    createNotification,
    getMatchingNotifications,
    getMessageNotifications
  };

  if (loading && !notifications.length) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}