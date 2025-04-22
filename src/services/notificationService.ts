// src/services/notificationService.ts
import { supabase } from '../lib/supabase';
import { 
  Notification, 
  NotificationPreference, 
  NotificationType,
  NotificationAction,
  NotificationMetadata
} from '../types/notification';
import { ConnectionStatus } from '../types/matching';

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      if (!userId) {
        console.error('通知の取得: ユーザーIDが指定されていません');
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('通知の取得に失敗しました:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('通知取得中にエラーが発生:', error);
      return [];
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      if (!userId) {
        console.error('未読数の取得: ユーザーIDが指定されていません');
        return 0;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('未読数の取得に失敗しました:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('未読数取得中にエラーが発生:', error);
      return 0;
    }
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      if (!notificationId) {
        console.error('既読処理: 通知IDが指定されていません');
        return false;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('通知を既読にできませんでした:', error);
        return false;
      }

      // リアルタイム更新は簡素化
      return true;
    } catch (error) {
      console.error('通知の既読処理中にエラーが発生:', error);
      return false;
    }
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      if (!userId) {
        console.error('一括既読処理: ユーザーIDが指定されていません');
        return false;
      }

      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: timestamp
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('すべての通知を既読にできませんでした:', error);
        return false;
      }

      // リアルタイム更新は簡素化
      return true;
    } catch (error) {
      console.error('一括既読処理中にエラーが発生:', error);
      return false;
    }
  },

  async createNotification(
    notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>
  ): Promise<Notification | null> {
    try {
      // 送信先ユーザーIDの確認
      if (!notification.user_id) {
        console.error('無効な送信先ユーザーID:', notification);
        throw new Error('通知の送信先ユーザーIDが指定されていません');
      }

      const timestamp = new Date().toISOString();
      
      // データベースにない可能性のあるフィールドを削除
      const notificationData = { ...notification };
      delete notificationData['thumbnail_url'];

      const newNotification = {
        ...notificationData,
        is_read: false,
        created_at: timestamp,
        updated_at: timestamp
      };

      // データベースへの挿入を試みる
      const { data, error } = await supabase
        .from('notifications')
        .insert([newNotification])
        .select();

      if (error) {
        console.error('通知作成エラー:', error.message, error.code);
        return null;
      }
      
      return data?.[0] || null;
    } catch (error) {
      console.error('通知作成中に例外が発生:', error);
      return null;
    }
  },

  async batchCreateNotifications(
    notifications: Array<Omit<Notification, 'id' | 'created_at' | 'is_read'>>
  ): Promise<{ data: Notification[], error: Error | null }> {
    try {
      // 送信先ユーザーIDの検証
      const validNotifications = notifications.filter(notification => {
        if (!notification.user_id) {
          console.error('無効な送信先ユーザーIDが含まれています:', notification);
          return false;
        }
        return true;
      });

      if (validNotifications.length === 0) {
        console.error('有効な通知がありません');
        return { data: [], error: new Error('有効な通知がありません') };
      }

      const timestamp = new Date().toISOString();
      const batchNotifications = validNotifications.map(notification => {
        // データベースにない可能性のあるフィールドを削除
        const notificationData = { ...notification };
        delete notificationData['thumbnail_url'];
        
        return {
          ...notificationData,
          is_read: false,
          created_at: timestamp,
          updated_at: timestamp
        };
      });

      // データベースへの挿入を試みる
      const { data, error } = await supabase
        .from('notifications')
        .insert(batchNotifications)
        .select();

      if (error) {
        console.error('通知バッチ作成エラー:', error.message);
        return { data: [], error: new Error('通知の一括作成に失敗しました') };
      }
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('通知バッチ作成中に例外が発生:', error);
      return { data: [], error: error instanceof Error ? error : new Error('通知の一括作成に失敗しました') };
    }
  },

  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      if (!notificationId) {
        console.error('通知削除: 通知IDが指定されていません');
        return false;
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('通知の削除に失敗しました:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('通知の削除中にエラーが発生:', error);
      return false;
    }
  },

  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    try {
      if (!userId) {
        console.error('通知設定取得: ユーザーIDが指定されていません');
        return null;
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('通知設定の取得に失敗しました:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('通知設定取得中にエラーが発生:', error);
      return null;
    }
  },

  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreference>
  ): Promise<boolean> {
    try {
      if (!userId) {
        console.error('通知設定更新: ユーザーIDが指定されていません');
        return false;
      }

      const timestamp = new Date().toISOString();

      // 既存の設定を確認
      const { data: existingPrefs } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingPrefs) {
        // 既存の設定を更新
        const { error } = await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: timestamp
          })
          .eq('user_id', userId);

        if (error) {
          console.error('通知設定の更新に失敗しました:', error);
          return false;
        }
      } else {
        // 新規設定を作成
        const defaultPreferences = {
          user_id: userId,
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
          matching_notifications: true,
          message_notifications: true,
          connection_notifications: true,
          email_notifications: false,
          push_notifications: true,
          in_app_notifications: true,
          quiet_hours_enabled: false,
          max_notifications_per_day: 50,
          batch_notifications: false,
          batch_interval_minutes: 30,
          created_at: timestamp,
          updated_at: timestamp
        };

        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            ...defaultPreferences,
            ...preferences
          });

        if (error) {
          console.error('通知設定の作成に失敗しました:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('通知設定更新中にエラーが発生:', error);
      return false;
    }
  },

  async filterNotificationsByType(
    userId: string, 
    type: NotificationType
  ): Promise<Notification[]> {
    try {
      if (!userId || !type) {
        console.error('通知フィルタリング: 無効なパラメータ', { userId, type });
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('通知のフィルタリングに失敗しました:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('通知フィルタリング中にエラーが発生:', error);
      return [];
    }
  },

  // マッチング用通知作成関数 - 改善版
  async createMatchingNotification(
    userId: string,
    targetUserId: string,
    matchScore: number,
    type: 'match' | 'like' | 'connection_request' = 'match'
  ): Promise<Notification | null> {
    try {
      if (!userId || !targetUserId) {
        console.error('マッチング通知作成: 無効なパラメータ', { userId, targetUserId });
        return null;
      }

      // 送信者ユーザーの情報を取得
      const { data: senderData, error: senderError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

      if (senderError || !senderData) {
        console.error('送信者のプロフィール取得エラー:', senderError);
        return null;
      }

      // 通知の基本情報設定
      const notificationBase = {
        user_id: targetUserId,
        type: type as NotificationType,
        sender_id: userId,
        notification_group: 'matching'
      };

      // 通知内容設定
      let title = '';
      let message = '';
      let priority: 'high' | 'medium' | 'low' = 'medium';
      let link = '/matching';
      let connectionId = '';
      let conversationId = '';

      // 通知種別に応じた内容設定
      switch (type) {
        case 'match':
          title = 'マッチングが成立しました！';
          message = `${senderData.username}さんとマッチングしました！メッセージを送ってみましょう。`;
          priority = 'high';
          
          // マッチングの場合は会話を作成または取得
          conversationId = await this._findOrCreateConversation(userId, targetUserId);
          
          // 会話IDが取得できた場合はリンクを更新
          if (conversationId) {
            link = `/messages/${conversationId}`;
          } else {
            link = '/messages'; // 会話IDが取得できなかった場合はデフォルトのリンク
          }
          break;

        case 'like':
          title = '新しいいいねがあります';
          message = `${senderData.username}さんからいいねが届きました。`;
          priority = 'medium';
          break;

        case 'connection_request':
          title = '新しい接続リクエスト';
          message = `${senderData.username}さんから接続リクエストが届きました。`;
          priority = 'high';
          
          // 接続リクエストの場合は接続レコードを作成
          connectionId = await this._createOrGetConnection(userId, targetUserId);
          if (!connectionId) {
            return null; // 接続レコード作成に失敗した場合
          }
          break;
      }

      // メタデータ作成
      const metadata: NotificationMetadata = {
        matching_data: {
          matched_user_id: userId,
          matched_username: senderData.username,
          match_score: matchScore,
          match_type: type === 'match' ? 'mutual' : 'like',
        }
      };

      // 会話IDが取得できた場合はメタデータに追加
      // NotificationMetadataに会話データのフィールドがない場合は、直接linkのみ設定する
      if (conversationId) {
        // 以下の行はコメントアウト
        // metadata.conversation_data = {
        //   conversation_id: conversationId,
        //   other_user_id: userId,
        //   other_username: senderData.username
        // };
        
        // リンクに会話IDを含める
        link = `/messages/${conversationId}`;
      }

      // 接続リクエストの場合は接続データも追加
      if (type === 'connection_request' && connectionId) {
        metadata.connection_data = {
          connection_id: connectionId,
          sender_id: userId,
          sender_username: senderData.username,
          sender_avatar_url: senderData.avatar_url,
          matching_score: matchScore,
          status: 'pending',
          action_required: true,
          request_date: new Date().toISOString()
        };
      }

      // 通知オブジェクト作成
      const notificationData = {
        ...notificationBase,
        title,
        message,
        priority,
        link,
        metadata
      };

      // 通知を作成
      return await this.createNotification(notificationData);
    } catch (error) {
      console.error('マッチング通知作成エラー:', error);
      return null;
    }
  },

  // 会話を検索または作成するヘルパーメソッド（新規追加）
  async _findOrCreateConversation(
    user1Id: string, 
    user2Id: string
  ): Promise<string> {
    try {
      // まず既存の会話を検索
      const { data: existingConv, error: existingConvError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
        .limit(1);
      
      // 既存の会話がある場合はそのIDを返す
      if (!existingConvError && existingConv && existingConv.length > 0) {
        const conversationId = existingConv[0].id;
        
        // 会話を再アクティブ化
        await supabase
          .from('conversations')
          .update({
            is_active: true,
            last_message_time: new Date().toISOString()
          })
          .eq('id', conversationId);
        
        return conversationId;
      }
      
      // 既存の会話がない場合は新規作成
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          user1_id: user1Id,
          user2_id: user2Id,
          last_message_time: new Date().toISOString(),
          is_active: true,
          user1_unread_count: 0,
          user2_unread_count: 0
        })
        .select('id');
      
      if (createError) {
        console.error('会話作成エラー:', createError);
        return '';
      }
      
      if (newConv && newConv.length > 0) {
        return newConv[0].id;
      }
      
      return '';
    } catch (error) {
      console.error('会話検索/作成エラー:', error);
      return '';
    }
  },

  // 接続レコードの作成・取得ヘルパーメソッド（既存）
  async _createOrGetConnection(
    userId: string, 
    targetUserId: string
  ): Promise<string> {
    try {
      // 既存のconnectionがないか確認
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('connected_user_id', userId)
        .maybeSingle();

      if (existingConnection) {
        return existingConnection.id;
      }

      // 新規接続レコードを作成
      const { data: newConnection, error: connError } = await supabase
        .from('connections')
        .insert({
          user_id: targetUserId,
          connected_user_id: userId,
          status: ConnectionStatus.PENDING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (connError || !newConnection) {
        console.error('接続レコード作成エラー:', connError);
        return '';
      }

      return newConnection.id;
    } catch (error) {
      console.error('接続作成エラー:', error);
      return '';
    }
  },

  // 接続リクエスト応答関数（既存）
  async respondToConnectionRequest(
    connectionId: string,
    status: ConnectionStatus.CONNECTED | ConnectionStatus.REJECTED
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!connectionId) {
        return { success: false, error: '接続IDが指定されていません' };
      }

      // 接続情報を取得
      const { data: connectionData, error: connectionError } = await supabase
        .from('connections')
        .select('id, user_id, connected_user_id, status')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connectionData) {
        console.error('接続情報取得エラー:', connectionError);
        return { success: false, error: '接続情報の取得に失敗しました' };
      }

      // 既に処理済みでないか確認
      if (connectionData.status !== ConnectionStatus.PENDING) {
        return { 
          success: false, 
          error: `この接続リクエストは既に${connectionData.status === ConnectionStatus.CONNECTED ? '承認' : '拒否'}されています` 
        };
      }

      // 接続状態を更新
      const { error: updateError } = await supabase
        .from('connections')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (updateError) {
        console.error('接続応答エラー:', updateError);
        return { success: false, error: '接続リクエスト応答に失敗しました' };
      }

      // 送信者のプロフィール情報を取得
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', connectionData.connected_user_id)
        .single();

      if (status === ConnectionStatus.CONNECTED) {
        // 会話IDを取得または作成
        const conversationId = await this._findOrCreateConversation(
          connectionData.user_id, 
          connectionData.connected_user_id
        );
        
        // 承認通知を送信
        await this._sendConnectionResponseNotification(
          connectionData, 
          senderProfile, 
          connectionId, 
          'connection_accepted', 
          '接続リクエストが承認されました',
          `${senderProfile?.username || 'ユーザー'}さんが接続リクエストを承認しました。メッセージを送ってみましょう！`,
          'accepted',
          conversationId // 会話IDを渡す
        );
      } else {
        // 拒否通知を送信
        await this._sendConnectionResponseNotification(
          connectionData, 
          senderProfile, 
          connectionId, 
          'connection_rejected', 
          '接続リクエストの結果',
          `${senderProfile?.username || 'ユーザー'}さんは現在接続リクエストを承認できません。`,
          'rejected'
        );
      }

      return { success: true };
    } catch (error) {
      console.error('接続応答処理エラー:', error);
      return { success: false, error: '接続応答処理に失敗しました' };
    }
  },

// 接続応答通知の送信ヘルパーメソッド（修正）
async _sendConnectionResponseNotification(
  connectionData: any, 
  senderProfile: any, 
  connectionId: string,
  type: NotificationType,
  title: string,
  message: string,
  status: 'pending' | 'accepted' | 'rejected',
  conversationId?: string // 会話IDを追加
): Promise<void> {
  try {
    // リンク先の設定（会話IDがある場合は会話画面へ）
    const link = (type === 'connection_accepted' && conversationId) 
      ? `/messages/${conversationId}` 
      : (type === 'connection_accepted' ? '/messages' : '/matching');
    
    // メタデータの準備
    const metadata: NotificationMetadata = {
      connection_data: {
        connection_id: connectionId,
        sender_id: connectionData.connected_user_id,
        sender_username: senderProfile?.username,
        sender_avatar_url: senderProfile?.avatar_url,
        status,
        action_required: false
      },
      matching_data: {
        matched_user_id: connectionData.connected_user_id,
        matched_username: senderProfile?.username,
        match_score: 0, // スコア情報がない場合はデフォルト値
        match_type: 'like' // "connection"から"like"に変更
      }
    };
    
    await this.createNotification({
      user_id: connectionData.connected_user_id,
      type,
      title,
      message,
      priority: 'high',
      link,
      sender_id: connectionData.user_id,
      notification_group: 'matching',
      metadata
    });
  } catch (error) {
    console.error(`${status}通知送信エラー:`, error);
    // 通知エラーは上位関数の成功判定に影響しない
  }
},

  // 通知アクションを実行する関数
  async executeNotificationAction(
    notificationId: string,
    action: NotificationAction,
    userId: string
  ): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
    try {
      // 入力検証
      if (!notificationId || !action || !userId) {
        return { 
          success: false, 
          error: '無効なパラメータ' 
        };
      }

      // 通知を取得
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .eq('user_id', userId) // RLS対応: 自分の通知のみアクセス可能
        .single();

      if (notificationError || !notification) {
        console.error('通知が見つかりませんでした:', notificationError);
        return { success: false, error: '通知が見つかりませんでした' };
      }

      // 通知を既読にする
      await this.markAsRead(notificationId);

      // 通知が取得できた場合の処理
      switch (action.type) {
        case 'accept':
          if (notification.type === 'connection_request' && notification.metadata?.connection_data) {
            const connectionId = notification.metadata.connection_data.connection_id;
            if (!connectionId) {
              return { success: false, error: '接続IDが見つかりません' };
            }
            
            console.log(`ユーザー ${userId} が接続リクエストを承認します:`, connectionId);
            
            const result = await this.respondToConnectionRequest(
              connectionId, 
              ConnectionStatus.CONNECTED
            );
            
            return { 
              success: result.success, 
              error: result.error,
              redirectUrl: result.success ? '/messaging' : undefined
            };
          }
          return { 
            success: false, 
            error: 'この通知タイプではこのアクションは実行できません' 
          };

        case 'reject':
          if (notification.type === 'connection_request' && notification.metadata?.connection_data) {
            const connectionId = notification.metadata.connection_data.connection_id;
            if (!connectionId) {
              return { success: false, error: '接続IDが見つかりません' };
            }
            
            console.log(`ユーザー ${userId} が接続リクエストを拒否します:`, connectionId);
            
            const result = await this.respondToConnectionRequest(
              connectionId, 
              ConnectionStatus.REJECTED
            );
            
            return { 
              success: result.success, 
              error: result.error
            };
          }
          return { 
            success: false, 
            error: 'この通知タイプではこのアクションは実行できません' 
          };

        case 'view':
          // プロフィール表示など
          console.log(`ユーザー ${userId} が通知 ${notificationId} を閲覧します`);
          
          return { 
            success: true, 
            redirectUrl: action.url || (notification.link || '/profile')
          };

        case 'reply':
          // メッセージ返信など
          if (notification.type === 'message' && notification.metadata?.message_data?.conversation_id) {
            console.log(`ユーザー ${userId} がメッセージに返信します:`, notification.metadata.message_data.conversation_id);
            
            return { 
              success: true, 
              redirectUrl: `/messages/${notification.metadata.message_data.conversation_id}`
            };
          }
          return { 
            success: false, 
            error: 'この通知タイプではこのアクションは実行できません' 
          };

        case 'link':
          // 通知のリンク先に移動
          console.log(`ユーザー ${userId} が通知リンクにアクセスします:`, notification.link);
          
          return { 
            success: true, 
            redirectUrl: action.url || (notification.link || '/')
          };

        case 'dismiss':
          // 通知を削除
          console.log(`ユーザー ${userId} が通知 ${notificationId} を削除します`);
          
          await this.deleteNotification(notificationId);
          return { success: true };

        default:
          return { success: false, error: '不明なアクションです' };
      }
    } catch (error) {
      console.error('通知アクション実行エラー:', error, `ユーザー: ${userId}`);
      return { success: false, error: '通知アクションの実行に失敗しました' };
    }
  },

  // レビュー数更新関数
  async updateReviewCount(videoId: string): Promise<number> {
    try {
      if (!videoId) {
        console.error('レビュー数更新: 動画IDが指定されていません');
        return 0;
      }
      
      // レビュー数を正確に取得
      const { count, error: countError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('video_id', videoId);

      if (countError) {
        console.error('レビュー数取得エラー:', countError);
        return 0;
      }

      const reviewCount = count ?? 0;

      // ビデオのレビュー数を更新
      const { error: updateError } = await supabase
        .from('videos')
        .update({ review_count: reviewCount })
        .eq('id', videoId);

      if (updateError) {
        console.error('レビュー数更新エラー:', updateError);
        return reviewCount; // 更新失敗でもカウントは返す
      }

      return reviewCount;
    } catch (error) {
      console.error('レビュー数の更新に失敗しました:', error);
      return 0;
    }
  }
};