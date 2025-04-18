// src/services/youtube-sync.service.ts
import { createClient } from '@supabase/supabase-js';
import { YouTubeAPI, YouTubeVideoDetailsItem } from '../lib/youtube';
import { YouTuberProfile, YouTubeVideo, YouTuberChannelDetails } from '../types/youtuber';
import { v4 as uuidv4 } from 'uuid'; // UUIDを生成するためにインポート

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class YouTubeSyncService {
 private tableColumnsCache: Record<string, string[]> = {};

 async syncChannelVideos(channelId: string, maxResults = 50): Promise<YouTubeVideo[]> {
     try {
         // UUIDとYouTubeチャンネルIDの判別（UUID形式の場合は別の処理）
         const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId);
         
         // YouTubeチャンネルIDかどうかチェック (UC... または @ で始まる)
         const isValidYouTubeChannelId = !isUUID && (
             channelId.startsWith('UC') && channelId.length > 10 || 
             channelId.startsWith('@')
         );
         
         if (!isValidYouTubeChannelId) {
             console.warn('無効なYouTubeチャンネルIDです:', channelId);
             
             // UUIDの場合は、youtuber_profilesテーブルからchannel_urlを取得
             if (isUUID) {
                 try {
                     const { data: profileData, error: profileError } = await supabase
                         .from('youtuber_profiles')
                         .select('channel_url')
                         .eq('id', channelId)
                         .limit(1);
                     
                     if (!profileError && profileData && profileData.length > 0 && profileData[0].channel_url) {
                         // channel_urlから直接YouTube APIで検索
                         const extractedChannelId = this.extractChannelId(profileData[0].channel_url);
                         if (extractedChannelId && (extractedChannelId.startsWith('UC') || extractedChannelId.startsWith('@'))) {
                             console.log(`UUID ${channelId} からチャンネルID ${extractedChannelId} を取得しました`);
                             // 再帰的に同期を実行
                             return this.syncChannelVideos(extractedChannelId, maxResults);
                         }
                     }
                 } catch (err) {
                     console.error('プロファイルデータ取得エラー:', err);
                 }
             }
             
             // データベースから既存の動画を取得する試み
             try {
                 // channel_idでの検索を試みる
                 const { data: existingVideos, error: existingError } = await supabase
                     .from('videos')
                     .select('*')
                     .eq('channel_id', channelId);
                 
                 if (!existingError && existingVideos && existingVideos.length > 0) {
                     console.log(`既存の${existingVideos.length}本の動画データを使用します`);
                     return existingVideos as YouTubeVideo[];
                 }
                 
                 // youtuber_idでの検索は、数値型フィールドなので@から始まる形式はエラーになる
                 // そのため試行しない
                 if (!channelId.startsWith('@') && !isUUID) {
                     // 数値として変換可能な場合のみ試行
                     const numericId = parseInt(channelId);
                     if (!isNaN(numericId)) {
                         const { data: existingYoutuberVideos, error: youtuberError } = await supabase
                             .from('videos')
                             .select('*')
                             .eq('youtuber_id', numericId);
                         
                         if (!youtuberError && existingYoutuberVideos && existingYoutuberVideos.length > 0) {
                             console.log(`既存の${existingYoutuberVideos.length}本の動画データを使用します（youtuber_id=${numericId}）`);
                             return existingYoutuberVideos as YouTubeVideo[];
                         }
                     }
                 }
                 
                 console.log('既存の動画データが見つかりませんでした');
             } catch (err) {
                 console.error('既存動画の検索中にエラーが発生しました:', err);
             }
             
             // 空の配列を返す（エラーをスローしない）
             return [];
         }
         
         // 有効なYouTubeチャンネルIDの場合はAPIを呼び出す
         console.log(`YouTubeチャンネルID ${channelId} を使用して動画を取得します`);
         
         // YouTuberIDをデータベースから取得（必要なyoutuber_idを設定するため）
         let youtuber_id = null;
         
         try {
             // 現在ログイン中のユーザーを取得
             const { data: { user } } = await supabase.auth.getUser();
             if (user) {
                 // ユーザーIDからyoutuberプロファイルを検索
                 const { data: youtuberProfile, error: profileError } = await supabase
                     .from('youtubers')
                     .select('id')
                     .eq('user_id', user.id)
                     .single();
                 
                 if (!profileError && youtuberProfile) {
                     youtuber_id = youtuberProfile.id;
                     console.log(`ログイン中のユーザーのYouTuber ID: ${youtuber_id}`);
                 } else {
                     console.warn('YouTuberプロファイルが見つかりません:', profileError);
                 }
             } else {
                 console.warn('ログインユーザーが取得できません');
             }
         } catch (error) {
             console.error('YouTuber ID取得エラー:', error);
         }
         
         const videos = await YouTubeAPI.fetchChannelVideos(channelId, maxResults);
         console.log(`取得した動画数: ${videos.length}`);
         
         // 各動画を同期
         const syncedVideos: YouTubeVideo[] = [];
         for (const video of videos) {
             try {
                 const syncedVideo = await this.syncSingleVideo(video, youtuber_id);
                 syncedVideos.push(syncedVideo);
             } catch (error) {
                 console.error('動画同期エラー:', error);
                 // エラーがあっても続行
             }
         }
         
         return syncedVideos;
     } catch (error) {
         console.error('チャンネル動画同期エラー:', error);
         return []; // エラーをスローせず空配列を返す
     }
 }

 private async syncSingleVideo(video: YouTubeVideoDetailsItem, youtuber_id: number | null): Promise<YouTubeVideo> {
   try {
       const genreSlug = this.mapCategoryToGenre(video.snippet.categoryId);
       
       // ジャンルIDの取得（エラーがあってもスキップ）
       let genreId = null;
       try {
           const { data: genreData } = await supabase
               .from('genres')
               .select('id')
               .eq('slug', genreSlug)
               .maybeSingle();
               
           if (genreData) genreId = genreData.id;
       } catch (err) {
           console.warn('ジャンル情報の取得に失敗しました:', err);
       }

       // レビュー数を取得（エラーがあってもスキップ）
       let reviewCount = 0;
       try {
           const { count, error: reviewError } = await supabase
               .from('video_ratings')
               .select('*', { count: 'exact', head: true })
               .eq('video_id', video.id);
               
           if (!reviewError && count !== null) reviewCount = count;
       } catch (err) {
           console.warn('レビュー数の取得に失敗しました:', err);
       }

       const createdAt = new Date().toISOString();
       const viewCount = parseInt(video.statistics?.viewCount || '0');
       const likeCount = video.statistics?.likeCount ? parseInt(video.statistics.likeCount) : 0;
       const rating = likeCount && viewCount ? (likeCount / viewCount) * 5 : 0;

       // まず、YouTube IDを使って既存の動画をデータベースから検索
       const { data: existingVideo } = await supabase
           .from('videos')
           .select('*')
           .eq('youtube_id', video.id)
           .maybeSingle();

       // 既存動画が見つかれば、そのIDを使用。見つからなければ新しいUUIDを生成
       const videoId = existingVideo?.id || uuidv4();

       // YouTubeVideo型に合わせたデータ構築
       const videoData: YouTubeVideo = {
           id: videoId, // ここでUUIDを使用（既存か新規生成）
           title: video.snippet?.title || '',
           description: video.snippet?.description || '',
           thumbnail: video.snippet?.thumbnails?.medium?.url || '',
           duration: YouTubeAPI.formatDuration(video.contentDetails?.duration || 'PT0S'),
           view_count: viewCount,
           rating: rating,
           genre_id: genreId || undefined,
           published_at: video.snippet?.publishedAt || new Date().toISOString(),
           channel_title: video.snippet?.channelTitle || '',
           comment_count: video.statistics?.commentCount ? parseInt(video.statistics.commentCount) : undefined,
           youtube_id: video.id,  // YouTube IDはここで保存
           created_at: existingVideo?.created_at || createdAt, // 既存なら元の作成日を維持
           updated_at: createdAt, // 更新日は常に現在時刻
           channel_id: video.snippet?.channelId || '',
           youtuber_id: youtuber_id  // ユーザーに関連付けられたYouTuber IDを設定
       };
       
       // データベース保存用の拡張データ（型定義外のフィールドを含む）
       const extendedVideoData: Record<string, any> = {
           ...videoData,
           // review_countはYouTubeVideo型にないので、拡張データとして追加
           review_count: reviewCount
       };
       
       // videosテーブルのカラム情報を取得
       const validColumns = await this.getTableColumns('videos');
       
       // テーブルに存在するカラムのみを含むデータを作成
       const finalVideoData: Record<string, any> = {};
       
       // 特に確認が必要な重要なカラム
       const criticalColumns = ['id', 'title', 'description', 'channel_id', 'published_at', 'thumbnail', 'youtube_id', 'youtuber_id'];
       
       for (const [key, value] of Object.entries(extendedVideoData)) {
           // 重要なカラムは常に含める
           if (criticalColumns.includes(key)) {
               finalVideoData[key] = value;
               continue;
           }
           
           // テーブルに存在するカラムのみ追加
           if (validColumns.length === 0 || validColumns.includes(key)) {
               finalVideoData[key] = value;
           } else {
               console.log(`${key}カラムは存在しないため、データから除外します`);
           }
       }
       
       // デバッグ: youtuber_idの確認
       console.log(`動画「${videoData.title}」にyoutuber_id=${youtuber_id}を設定します`);
       
       // 修正: .select()を削除して単純化
       const { error } = await supabase
           .from('videos')
           .upsert(finalVideoData, {
               onConflict: 'id', // IDで競合する場合は更新
               ignoreDuplicates: false // 重複を無視せず、更新する
           });

       if (error) {
           console.error('動画保存エラー:', error);
           throw error;
       }
       
       // 必要ならば挿入後のデータを個別クエリで取得
       const { data: insertedData, error: fetchError } = await supabase
           .from('videos')
           .select('*')
           .eq('id', videoId) // UUIDを使って検索
           .limit(1);
       
       if (fetchError) {
           console.warn('挿入後のデータ取得に失敗:', fetchError);
           return videoData;
       }
       
       return (insertedData && insertedData[0]) || videoData;
   } catch (error) {
       console.error('動画同期エラー:', error);
       throw error;
   }
 }

 // テーブルのカラム一覧を取得するヘルパー関数
 private async getTableColumns(tableName: string): Promise<string[]> {
     try {
         // キャッシュ用の静的変数
         if (!this.tableColumnsCache) {
             this.tableColumnsCache = {};
         }
         
         // キャッシュがあればそれを返す
         if (this.tableColumnsCache[tableName]) {
             return this.tableColumnsCache[tableName];
         }
         
         // テーブル情報取得のために最小限のクエリを実行
         const { data, error } = await supabase
             .from(tableName)
             .select()
             .limit(1);
             
         if (error) {
             console.warn(`${tableName}テーブルの情報取得に失敗しました:`, error);
             return [];
         }
         
         // データが存在すれば、最初のオブジェクトのキーを返す
         if (data && data.length > 0) {
             const columns = Object.keys(data[0]);
             this.tableColumnsCache[tableName] = columns;
             return columns;
         }
         
         // サンプルデータがない場合は空配列を返す
         return [];
     } catch (error) {
         console.warn(`${tableName}テーブルのカラム情報取得に失敗しました:`, error);
         return [];
     }
 }

 // 有効なテーブルのリストを取得
 private async getValidTables(tableNames: string[]): Promise<string[]> {
     const validTables: string[] = [];
     
     for (const tableName of tableNames) {
         try {
             const { error } = await supabase
                 .from(tableName)
                 .select('id')
                 .limit(1);
                 
             if (!error) {
                 validTables.push(tableName);
             }
         } catch (error) {
             console.warn(`${tableName}テーブルは存在しないかアクセスできません`);
         }
     }
     
     return validTables;
 }

 private mapCategoryToGenre(categoryId: string): string {
     const categoryToGenre: Record<string, string> = {
         '10': 'music', 
         '20': 'gaming', 
         '24': 'entertainment',
         '27': 'education', 
         '28': 'technology', 
         '26': 'lifestyle',
         '17': 'sports', 
         '25': 'news', 
         '15': 'pets-and-animals',
         '22': 'others', 
         '1': 'entertainment', 
         '2': 'cars'
     };
     return categoryToGenre[categoryId] || 'others';
 }

 public async syncChannelProfile(channelUrl: string): Promise<YouTuberProfile> {
     try {
         let channelId = '';
         try {
             channelId = this.extractChannelId(channelUrl);
         } catch (error) {
             console.warn('チャンネルIDの抽出に失敗:', error);
             channelId = channelUrl; // エラー時はURLをそのまま使用
         }
         
         // チャンネル情報の取得を試みる
         let channelDetails: YouTuberChannelDetails;
         try {
             channelDetails = await YouTubeAPI.getChannelDetails(channelId) as YouTuberChannelDetails;
         } catch (error) {
             console.error('YouTube API経由でのチャンネル情報取得に失敗:', error);
             
             // 最小限のプロファイル情報でフォールバック
             return {
                 channel_name: 'チャンネル名不明',
                 channel_url: channelUrl,
                 verification_status: 'pending',
                 created_at: new Date().toISOString(),
                 updated_at: new Date().toISOString()
             } as YouTuberProfile;
         }

         // 基本的なプロファイルデータを構築
         const profileData: Record<string, any> = {
             channel_name: channelDetails.title || 'チャンネル名不明',
             channel_url: channelUrl,
             channel_description: channelDetails.description || '',
             verification_status: 'pending',
             avatar_url: channelDetails.thumbnails?.default?.url || '',
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString()
         };
         
         // channel_idはオプションで追加（テーブルに存在する場合のみ）
         if (channelId) {
             profileData.channel_id = channelId;
         }
         
         // 統計情報も追加
         if (channelDetails.subscriberCount) profileData.subscribers = parseInt(channelDetails.subscriberCount);
         if (channelDetails.videoCount) profileData.video_count = parseInt(channelDetails.videoCount);
         if (channelDetails.viewCount) profileData.total_views = parseInt(channelDetails.viewCount);
         
         // 適切なテーブル名を特定
         const validTables = await this.getValidTables(['youtuber_profiles', 'youtubers']);
         if (validTables.length === 0) {
             console.error('有効なYouTuberプロファイルテーブルが見つかりません');
             return profileData as YouTuberProfile;
         }
         
         const tableName = validTables[0]; // 最初に見つかったテーブルを使用
         console.log(`YouTuberプロファイル用に${tableName}テーブルを使用します`);
         
         // テーブルのカラム情報を取得
         const tableColumns = await this.getTableColumns(tableName);
         
         // テーブルに存在するカラムのみを含むデータを作成
         const filteredProfileData: Record<string, any> = {};
         for (const [key, value] of Object.entries(profileData)) {
             if (tableColumns.includes(key)) {
                 filteredProfileData[key] = value;
             } else {
                 console.log(`テーブル${tableName}には${key}カラムが存在しないためスキップします`);
             }
         }
         
         // 検索方法を決定（channel_idがある場合はそれを使用、なければchannel_url）
         const searchColumn = tableColumns.includes('channel_id') ? 'channel_id' : 'channel_url';
         const searchValue = searchColumn === 'channel_id' ? channelId : channelUrl;
         
         // プロファイルを保存
         try {
             // 既存のプロファイルを検索
             const { data: existingProfile, error: fetchError } = await supabase
                 .from(tableName)
                 .select('id')
                 .eq(searchColumn, searchValue)
                 .maybeSingle();
             
             if (fetchError) {
                 console.warn('既存プロファイル検索時のエラー:', fetchError);
             }
             
             if (existingProfile && existingProfile.id) {
                 // 既存のプロファイルを更新
                 // 修正: .select().maybeSingle()を削除して単純化
                 const { error } = await supabase
                     .from(tableName)
                     .update(filteredProfileData)
                     .eq('id', existingProfile.id);
                 
                 if (error) {
                     throw error;
                 }
                 
                 // 更新後のデータを別クエリで取得
                 const { data: updatedData, error: fetchUpdatedError } = await supabase
                     .from(tableName)
                     .select('*')
                     .eq('id', existingProfile.id)
                     .limit(1);
                 
                 if (fetchUpdatedError) {
                     console.warn('更新後のデータ取得に失敗:', fetchUpdatedError);
                     return profileData as YouTuberProfile;
                 }
                 
                 return (updatedData && updatedData[0]) || profileData as YouTuberProfile;
             } else {
                 // 新規プロファイルを作成
                 // 修正: .select().maybeSingle()を削除して単純化
                 const { error } = await supabase
                     .from(tableName)
                     .insert(filteredProfileData);
                 
                 if (error) {
                     throw error;
                 }
                 
                 // 挿入後のデータを別クエリで取得
                 const { data: insertedData, error: fetchInsertedError } = await supabase
                     .from(tableName)
                     .select('*')
                     .eq(searchColumn, searchValue)
                     .limit(1);
                 
                 if (fetchInsertedError) {
                     console.warn('挿入後のデータ取得に失敗:', fetchInsertedError);
                     return profileData as YouTuberProfile;
                 }
                 
                 return (insertedData && insertedData[0]) || profileData as YouTuberProfile;
             }
         } catch (error) {
             console.error('プロファイル保存エラー:', error);
             return profileData as YouTuberProfile;
         }
     } catch (error) {
         console.error('チャンネル同期エラー:', error);
         
         // エラーをスローするのではなく、デフォルトプロファイルを返す
         return {
             channel_name: 'チャンネル情報取得失敗',
             channel_url: channelUrl,
             channel_id: this.tryExtractChannelId(channelUrl), // 実際に使用
             verification_status: 'pending',
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString()
         } as YouTuberProfile;
     }
 }

 // チャンネルIDの抽出（エラー時はデフォルト値を返すバージョン）
 private tryExtractChannelId(channelUrl: string): string {
     try {
         return this.extractChannelId(channelUrl);
     } catch (error) {
         return channelUrl || '';
     }
 }

 public extractChannelId(channelUrl: string): string {
     if (!channelUrl) return '';
     
     // 既にUC...形式のチャンネルIDの場合はそのまま返す
     if (channelUrl.startsWith('UC') && channelUrl.length > 10) {
         return channelUrl;
     }
     
     // @username 形式
     if (channelUrl.startsWith('@')) {
         return channelUrl;
     }
     
     // 複数のURL形式に対応
     // channel/UC... 形式
     const channelMatch = channelUrl.match(/channel\/([a-zA-Z0-9_-]{24})/);
     if (channelMatch) return channelMatch[1];
     
     // youtube.com/@username 形式
     const atMatch = channelUrl.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
     if (atMatch) return '@' + atMatch[1];
     
     // youtube.com/c/customname 形式
     const cMatch = channelUrl.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/);
     if (cMatch) return '@' + cMatch[1];
     
     // youtube.com/user/username 形式
     const userMatch = channelUrl.match(/youtube\.com\/user\/([a-zA-Z0-9_-]+)/);
     if (userMatch) return '@' + userMatch[1];
     
     // 上記のパターンに一致しない場合はURLをそのまま返す
     return channelUrl;
 }
}

export const youtubeSyncService = new YouTubeSyncService();