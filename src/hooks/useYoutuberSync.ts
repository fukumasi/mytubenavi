// src/hooks/useYoutuberSync.ts
import { useState, useCallback } from 'react';
import { YouTubeSyncService } from '@/services/youtube-sync.service';
import { SyncStatus, YouTuberSyncResult, YouTuberProfile } from '@/types/youtuber';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const youtubeSyncService = new YouTubeSyncService();

/**
 * YouTubeチャンネル情報の同期を管理するカスタムフック
 * @returns 同期関連の関数と状態
 */
export function useYoutuberSync() {
   const { user } = useAuth();
   const [syncStatus, setSyncStatus] = useState<SyncStatus>({
       status: 'idle',
       message: '',
       lastSyncedAt: undefined,
       error: undefined
   });

   /**
    * オブジェクトから安全にプロパティを取得する関数
    * @param obj 対象オブジェクト
    * @param propNames 取得したいプロパティ名の配列（優先順位順）
    * @param defaultValue デフォルト値
    * @returns 見つかったプロパティ値またはデフォルト値
    */
   const getPropertySafe = (obj: any, propNames: string[], defaultValue: any = ''): any => {
       if (!obj || typeof obj !== 'object') return defaultValue;
       
       // 優先順位順にプロパティを探す
       for (const propName of propNames) {
           if (obj[propName] !== undefined && obj[propName] !== null) {
               return obj[propName];
           }
       }
       
       return defaultValue;
   };

   /**
    * チャンネル同期処理のステータスとエラーを記録
    * @param userId ユーザーID
    * @param channelId チャンネルID
    * @param syncType 同期タイプ
    * @param status 同期ステータス
    * @param videosCount 同期した動画数
    * @param errorMessage エラーメッセージ
    */
   const logSyncStatus = async (
       userId: string,
       channelId: string, 
       syncType: 'initial' | 'resync' | 'update', 
       status: 'success' | 'error',
       videosCount?: number,
       errorMessage?: string
   ) => {
       try {
           const logEntry = {
               id: userId,
               channel_id: channelId,
               sync_type: syncType,
               status: status,
               videos_synced: videosCount || 0,
               error_message: errorMessage || null,
               created_at: new Date().toISOString()
           };

           const { error } = await supabase
               .from('youtube_sync_logs')
               .insert(logEntry);

           if (error) {
               console.error('同期ログの記録に失敗しました:', error);
           }
       } catch (err) {
           console.error('同期ログ記録中にエラーが発生しました:', err);
       }
   };

   /**
    * チャンネル情報を同期する関数
    * @param channelUrl YouTubeチャンネルURL
    * @returns 同期結果
    */
   const syncChannel = useCallback(async (channelUrl: string): Promise<YouTuberSyncResult> => {
       if (!user) {
           const error = new Error('ユーザーがログインしていません');
           setSyncStatus({ 
               status: 'error', 
               message: error.message,
               error
           });
           throw error;
       }

       // URLの基本的な検証
       if (!channelUrl || typeof channelUrl !== 'string') {
           const error = new Error('無効なチャンネルURLです');
           setSyncStatus({
               status: 'error',
               message: error.message,
               error
           });
           throw error;
       }

       setSyncStatus({ status: 'syncing', message: 'チャンネル情報同期中...', lastSyncedAt: undefined });

       let channelId = '';
       let profile: YouTuberProfile | null = null;
       let videos = [];

       try {
           // チャンネルURLからIDを抽出
           channelId = youtubeSyncService.extractChannelId(channelUrl);
           
           // 抽出できない場合はURLそのものを使用
           if (!channelId) {
               console.warn('チャンネルIDを抽出できませんでした。URLをそのまま使用します:', channelUrl);
               channelId = channelUrl;
           }

           // リトライメカニズムを追加
           let retryCount = 0;
           const maxRetries = 3;
           
           while (retryCount < maxRetries) {
               try {
                   // チャンネルプロフィールの同期
                   profile = await youtubeSyncService.syncChannelProfile(channelUrl);
                   break; // 成功したらループを抜ける
               } catch (error) {
                   retryCount++;
                   if (retryCount >= maxRetries) throw error;
                   
                   // 指数バックオフ (1秒, 2秒, 4秒)
                   const delay = Math.pow(2, retryCount - 1) * 1000;
                   console.warn(`チャンネルプロフィール同期エラー、${delay}ms後に再試行 (${retryCount}/${maxRetries})`, error);
                   await new Promise(resolve => setTimeout(resolve, delay));
               }
           }

           // 抽出されたプロファイルからチャンネルIDを取得（存在する場合）
           const profileChannelId = getPropertySafe(profile, ['id', 'channelId', 'channel_id'], null);
           if (profileChannelId) {
               channelId = profileChannelId;
           }

           // 動画の同期
           retryCount = 0;
           while (retryCount < maxRetries) {
               try {
                   videos = await youtubeSyncService.syncChannelVideos(channelId);
                   break; // 成功したらループを抜ける
               } catch (error) {
                   retryCount++;
                   if (retryCount >= maxRetries) throw error;
                   
                   // 指数バックオフ (1秒, 2秒, 4秒)
                   const delay = Math.pow(2, retryCount - 1) * 1000;
                   console.warn(`動画同期エラー、${delay}ms後に再試行 (${retryCount}/${maxRetries})`, error);
                   await new Promise(resolve => setTimeout(resolve, delay));
               }
           }

           // プロファイルが取得できなかった場合のフォールバック
           if (!profile) {
               // 最小限のプロファイル情報を生成
               profile = {
                   channel_name: '取得できませんでした',
                   channel_url: channelUrl,
                   verification_status: 'pending',
                   channel_id: channelId
               };
           }

           // youtuber_profilesテーブルの更新
           if (profile) {
               // 修正: プロファイルデータを構築する際に正しいカラム構造を使用
               const profileData = {
                   // id: user.id,  // 削除：idはUUIDで自動生成されるべき
                   channel_id: channelId,
                   channel_name: getPropertySafe(profile, [
                       'channel_name', 'channelName', 'title', 'name'
                   ], 'チャンネル名不明'),
                   channel_url: channelUrl,
                   channel_description: getPropertySafe(profile, [
                       'description', 'channelDescription', 'about', 'bio'
                   ], ''),
                   // thumbnailを追加して使用する
                   thumbnail_url: getPropertySafe(profile, [
                       'thumbnail', 'thumbnailUrl', 'thumbnail_url', 
                       'avatar', 'avatarUrl', 'avatar_url',
                       'profileImage', 'profileImageUrl'
                   ], '/default-avatar.jpg'),
                   verification_status: 'pending',
                   created_at: new Date().toISOString(),
                   updated_at: new Date().toISOString()
               };

               // 既存のプロファイルを確認
               const { data: existingProfile, error: fetchError } = await supabase
                   .from('youtuber_profiles')
                   .select('id')
                   .eq('channel_id', channelId)
                   .maybeSingle();

               if (fetchError) {
                   console.error('YouTuber プロファイル確認エラー:', fetchError);
               }

               let upsertError;
               if (existingProfile) {
                   // 既存のプロファイルがある場合は更新
                   const { error } = await supabase
                       .from('youtuber_profiles')
                       .update(profileData)
                       .eq('id', existingProfile.id);
                   upsertError = error;
               } else {
                   // 新規作成
                   const { error } = await supabase
                       .from('youtuber_profiles')
                       .insert(profileData);
                   upsertError = error;
               }

               if (upsertError) {
                   console.error('YouTuber プロファイル更新エラー:', upsertError);
                   // エラーがあっても処理は続行
               }
           }

           // 同期ログの記録
           await logSyncStatus(
               user.id,
               channelId,
               'initial',
               'success',
               videos.length
           );

           // YouTuberSyncResultインターフェースに合わせて、channelIdは含めない
           const result: YouTuberSyncResult = {
               profile, // ここでnullにならないことを保証
               syncedVideosCount: videos.length,
               syncedAt: new Date()
           };

           // ログ出力用に追加情報を提供するが、戻り値には含めない
           console.info('同期完了:', {
               ...result,
               channelId
           });

           setSyncStatus({ 
               status: 'success', 
               message: `${videos.length}本の動画を同期しました`, 
               lastSyncedAt: new Date() 
           });

           return result;
       } catch (error) {
           const errorMessage = error instanceof Error 
               ? error.message 
               : '同期中にエラーが発生しました';
           
           // エラーログを記録
           await logSyncStatus(
               user.id,
               channelId || youtubeSyncService.extractChannelId(channelUrl) || channelUrl,
               'initial',
               'error',
               0,
               errorMessage
           );
           
           setSyncStatus({ 
               status: 'error', 
               message: errorMessage, 
               error: error instanceof Error ? error : new Error(errorMessage)
           });

           throw error;
       }
   }, [user]);

   /**
    * チャンネル動画を再同期する関数
    * @param channelId YouTubeチャンネルID
    * @returns 同期した動画数
    */
   const resyncChannel = useCallback(async (channelId: string): Promise<number> => {
       if (!user) {
           const error = new Error('ユーザーがログインしていません');
           setSyncStatus({ 
               status: 'error', 
               message: error.message,
               error
           });
           throw error;
       }

       if (!channelId) {
           const error = new Error('チャンネルIDが指定されていません');
           setSyncStatus({
               status: 'error',
               message: error.message,
               error
           });
           throw error;
       }

       setSyncStatus({ status: 'syncing', message: '動画再同期中...', lastSyncedAt: undefined });

       try {
           // リトライメカニズム
           let retryCount = 0;
           const maxRetries = 3;
           let videos = [];
           
           while (retryCount < maxRetries) {
               try {
                   videos = await youtubeSyncService.syncChannelVideos(channelId);
                   break; // 成功したらループを抜ける
               } catch (error) {
                   retryCount++;
                   if (retryCount >= maxRetries) throw error;
                   
                   // 指数バックオフ (1秒, 2秒, 4秒)
                   const delay = Math.pow(2, retryCount - 1) * 1000;
                   console.warn(`動画再同期エラー、${delay}ms後に再試行 (${retryCount}/${maxRetries})`, error);
                   await new Promise(resolve => setTimeout(resolve, delay));
               }
           }

           // 同期ログの記録
           await logSyncStatus(
               user.id,
               channelId,
               'resync',
               'success',
               videos.length
           );

           // プロファイルの最終更新日時を更新
           // 修正: channel_idで検索するように変更
           const { error } = await supabase
               .from('youtuber_profiles')
               .update({ updated_at: new Date().toISOString() })
               .eq('channel_id', channelId);  // idではなくchannel_idで検索

           if (error) {
               console.error('プロファイル更新日時の更新に失敗しました:', error);
           }

           setSyncStatus({ 
               status: 'success', 
               message: `${videos.length}本の動画を再同期しました`, 
               lastSyncedAt: new Date() 
           });

           return videos.length;
       } catch (error) {
           const errorMessage = error instanceof Error 
               ? error.message 
               : '再同期中にエラーが発生しました';
           
           // エラーログを記録
           await logSyncStatus(
               user.id,
               channelId,
               'resync',
               'error',
               0,
               errorMessage
           );
           
           setSyncStatus({ 
               status: 'error', 
               message: errorMessage, 
               error: error instanceof Error ? error : new Error(errorMessage)
           });

           throw error;
       }
   }, [user]);

   /**
    * 最新の同期ステータスを取得する関数
    * @param userId ユーザーID
    * @returns 最新の同期ログエントリ
    */
   const getLatestSyncStatus = useCallback(async (userId: string) => {
       if (!userId) return null;
       
       const { data, error } = await supabase
           .from('youtube_sync_logs')
           .select('*')
           .eq('id', userId)
           .order('created_at', { ascending: false })
           .limit(1)
           .single();
           
       if (error) {
           console.error('同期ログ取得エラー:', error);
           return null;
       }
       
       return data;
   }, []);

   return {
       syncStatus,
       syncChannel,
       resyncChannel,
       getLatestSyncStatus
   };
}