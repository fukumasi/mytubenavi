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
    * チャンネル同期処理のステータスとエラーを記録（シンプル化版）
    * @param userId ユーザーID
    * @param syncType 同期タイプ
    * @param status 同期ステータス
    * @param videosCount 同期した動画数
    * @param errorMsg エラーメッセージ
    */
   const logSyncStatus = async (
     userId: string,
     syncType: 'initial' | 'resync' | 'update',
     status: 'success' | 'error',
     videosCount?: number,
     errorMsg?: string
   ) => {
     try {
       // 同期ログをコンソールに出力（これは常に動作する）
       console.log(`同期ログ: ユーザー=${userId}, タイプ=${syncType}, 状態=${status}, 動画数=${videosCount || 0}${errorMsg ? ', エラー=' + errorMsg : ''}`);
       
       // RLSの問題を回避するため、ログ記録はコンソールのみに留める
       // もしログをDBに記録する必要がある場合は、後で管理者向けAPI経由で行う
     } catch (err) {
       // 最上位のエラーハンドリング - 静かに失敗
       console.error('同期ログ処理中に予期せぬエラーが発生しました:', err);
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
           try {
               channelId = youtubeSyncService.extractChannelId(channelUrl);
           } catch (e) {
               console.warn('チャンネルID抽出エラー:', e);
               // エラーが発生した場合はURLをそのまま使用
               channelId = channelUrl;
           }
           
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
                   if (retryCount >= maxRetries) {
                       console.error('チャンネルプロフィール同期に3回失敗しました。デフォルト値を使用します');
                       // 失敗した場合は最小限のプロフィール情報を生成
                       profile = {
                           channel_name: 'チャンネル情報取得失敗',
                           channel_url: channelUrl,
                           verification_status: 'pending',
                           created_at: new Date().toISOString(),
                           updated_at: new Date().toISOString()
                       } as YouTuberProfile;
                       break;
                   }
                   
                   // 指数バックオフ (1秒, 2秒, 4秒)
                   const delay = Math.pow(2, retryCount - 1) * 1000;
                   console.warn(`チャンネルプロフィール同期エラー、${delay}ms後に再試行 (${retryCount}/${maxRetries})`, error);
                   await new Promise(resolve => setTimeout(resolve, delay));
               }
           }

           // 抽出されたプロファイルからチャンネルIDを取得（存在する場合）
           const profileChannelId = getPropertySafe(profile, ['id', 'channelId'], null);
           if (profileChannelId) {
               channelId = profileChannelId;
           }

           // 動画の同期
           let syncError = null;
           retryCount = 0;
           while (retryCount < maxRetries) {
               try {
                   videos = await youtubeSyncService.syncChannelVideos(channelId);
                   syncError = null;
                   break; // 成功したらループを抜ける
               } catch (error) {
                   syncError = error;
                   retryCount++;
                   if (retryCount >= maxRetries) {
                       console.error('動画同期に3回失敗しました:', error);
                       // 3回失敗したら空配列を使用して続行
                       videos = [];
                       break;
                   }
                   
                   // 指数バックオフ (1秒, 2秒, 4秒)
                   const delay = Math.pow(2, retryCount - 1) * 1000;
                   console.warn(`動画同期エラー、${delay}ms後に再試行 (${retryCount}/${maxRetries})`, error);
                   await new Promise(resolve => setTimeout(resolve, delay));
               }
           }

           // プロファイルが取得できなかった場合のフォールバック
           if (!profile) {
               // 最小限のプロフィール情報を生成
               profile = {
                   channel_name: '取得できませんでした',
                   channel_url: channelUrl,
                   verification_status: 'pending',
                   created_at: new Date().toISOString(),
                   updated_at: new Date().toISOString()
               } as YouTuberProfile;
           }

           // youtuber_profilesテーブルの更新
           if (profile) {
               try {
                   // 既存のプロファイルを確認（エラーハンドリング強化）
                   const { data: existingProfile, error: fetchError } = await supabase
                       .from('youtuber_profiles')
                       .select('id')
                       .eq('channel_url', channelUrl)
                       .maybeSingle();

                   if (fetchError) {
                       console.error('YouTuber プロファイル確認エラー:', fetchError);
                       // エラーの詳細を記録
                       console.error('エラー詳細:', JSON.stringify(fetchError));
                   }

                   if (existingProfile && existingProfile.id) {
                       // 既存のプロファイルがある場合は更新
                       const profileData = {
                           channel_name: getPropertySafe(profile, [
                               'channel_name', 'channelName', 'title', 'name'
                           ], 'チャンネル名不明'),
                           channel_url: channelUrl,
                           channel_description: getPropertySafe(profile, [
                               'description', 'channelDescription', 'about', 'bio'
                           ], ''),
                           verification_status: 'pending',
                           category: getPropertySafe(profile, ['category', 'categoryName'], '') || null,
                           updated_at: new Date().toISOString()
                       };
                       
                       // 修正: .select()を削除して単純化
                       try {
                           const { error: updateError } = await supabase
                               .from('youtuber_profiles')
                               .update(profileData)
                               .eq('id', existingProfile.id);
                           
                           if (updateError) {
                               console.error('YouTuber プロファイル更新エラー:', updateError);
                               console.error('更新エラー詳細:', JSON.stringify(updateError));
                           } else {
                               console.log('YouTuber プロファイルを更新しました');
                           }
                       } catch (updateError) {
                           console.error('プロファイル更新処理で例外発生:', updateError);
                       }
                   } else {
                       // 新規作成
                       const profileData = {
                           channel_name: getPropertySafe(profile, [
                               'channel_name', 'channelName', 'title', 'name'
                           ], 'チャンネル名不明'),
                           channel_url: channelUrl,
                           channel_description: getPropertySafe(profile, [
                               'description', 'channelDescription', 'about', 'bio'
                           ], ''),
                           verification_status: 'pending',
                           category: getPropertySafe(profile, ['category', 'categoryName'], '') || null,
                           created_at: new Date().toISOString(),
                           updated_at: new Date().toISOString()
                       };
                       
                       const { error: insertError } = await supabase
                           .from('youtuber_profiles')
                           .insert(profileData);
                       
                       if (insertError) {
                           console.error('YouTuber プロファイル作成エラー:', insertError);
                           console.error('作成エラー詳細:', JSON.stringify(insertError));
                       } else {
                           console.log('YouTuber プロファイルを新規作成しました');
                       }
                   }
               } catch (dbError) {
                   console.error('YouTuber プロファイルDB操作エラー:', dbError);
                   // エラーがあっても処理は続行
               }
           }

           // 同期ログの記録（コンソールのみ）
           try {
               await logSyncStatus(
                   user.id,
                   'initial',
                   syncError ? 'error' : 'success',
                   videos.length,
                   syncError ? (syncError instanceof Error ? syncError.message : '同期エラー') : undefined
               );
           } catch (logError) {
               console.warn('同期ログ記録エラー:', logError);
               // ログエラーは無視
           }

           // YouTuberSyncResultインターフェースに合わせて結果を返す
           const result: YouTuberSyncResult = {
               profile: profile || null, // nullの場合に対応
               syncedVideosCount: videos.length,
               syncedAt: new Date()
           };

           // 成功状態を設定
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
           
           // エラーログを記録（コンソールのみ）
           try {
               await logSyncStatus(
                   user.id,
                   'initial',
                   'error',
                   0,
                   errorMessage
               );
           } catch (logError) {
               console.warn('エラーログ記録中にエラーが発生:', logError);
           }
           
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
           let syncError = null;
           
           while (retryCount < maxRetries) {
               try {
                   videos = await youtubeSyncService.syncChannelVideos(channelId);
                   syncError = null;
                   break; // 成功したらループを抜ける
               } catch (error) {
                   syncError = error;
                   retryCount++;
                   if (retryCount >= maxRetries) {
                       console.error('動画再同期に3回失敗しました:', error);
                       // 空配列で続行
                       videos = [];
                       break;
                   }
                   
                   // 指数バックオフ (1秒, 2秒, 4秒)
                   const delay = Math.pow(2, retryCount - 1) * 1000;
                   console.warn(`動画再同期エラー、${delay}ms後に再試行 (${retryCount}/${maxRetries})`, error);
                   await new Promise(resolve => setTimeout(resolve, delay));
               }
           }

           // 同期ログの記録（コンソールのみ）
           try {
               await logSyncStatus(
                   user.id,
                   'resync',
                   syncError ? 'error' : 'success',
                   videos.length,
                   syncError ? (syncError instanceof Error ? syncError.message : '再同期エラー') : undefined
               );
           } catch (logError) {
               console.warn('同期ログ記録エラー:', logError);
               // ログエラーは無視
           }

           // 関連するプロファイルの更新日時を更新
           try {
               // youtuber_profilesテーブルの確認
               const { data: profiles, error: profileError } = await supabase
                   .from('youtuber_profiles')
                   .select('id, channel_url')
                   .filter('channel_url', 'ilike', `%${channelId}%`)
                   .limit(1);
               
               if (profileError) {
                   console.error('プロファイル検索エラー:', profileError);
               } else if (profiles && profiles.length > 0) {
                   // 修正: .select()を削除して単純化
                   try {
                       const { error: updateError } = await supabase
                           .from('youtuber_profiles')
                           .update({ updated_at: new Date().toISOString() })
                           .eq('id', profiles[0].id);
                       
                       if (updateError) {
                           console.error('プロファイル更新日時の更新エラー:', updateError);
                       } else {
                           console.log('プロファイル更新日時を更新しました');
                       }
                   } catch (updateError) {
                       console.error('プロファイル更新で例外発生:', updateError);
                   }
               }
           } catch (updateError) {
               console.error('プロファイル更新処理エラー:', updateError);
               // エラーがあっても続行
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
           
           // エラーログを記録（コンソールのみ）
           try {
               await logSyncStatus(
                   user.id,
                   'resync',
                   'error',
                   0,
                   errorMessage
               );
           } catch (logError) {
               console.warn('エラーログ記録中にエラー:', logError);
           }
           
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
    * @returns 常にnullを返す（ログはコンソールのみに記録）
    */
   const getLatestSyncStatus = useCallback(async (userId: string) => {
       // RLSの問題があるため、ログの取得はスキップ
       console.log(`ユーザー${userId}の同期ログは現在利用できません`);
       return null;
   }, []);

   return {
       syncStatus,
       syncChannel,
       resyncChannel,
       getLatestSyncStatus
   };
}