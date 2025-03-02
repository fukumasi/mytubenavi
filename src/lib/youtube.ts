// src/lib/youtube.ts
import axios from 'axios';
import { supabase } from './supabase';
import type { Video } from '../types';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
if (!API_KEY) {
 console.error('YouTube API key is not set in environment variables');
}
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeSearchItem {
 id: {
     videoId: string;
 };
 snippet: {
     title: string;
     description: string;
     thumbnails: {
         medium: {
             url: string;
         };
     };
     publishedAt: string;
     channelTitle: string;
     channelId: string;
     categoryId: string;
 };
}

interface YouTubeSearchResponse {
 items: YouTubeSearchItem[];
 pageInfo: {
     totalResults: number;
 };
 nextPageToken?: string;
}

// src/lib/youtube.ts
export interface YouTubeVideoDetailsItem {
 id: string;
 snippet: {
     title: string;
     description: string;
     thumbnails: {
         medium: {
             url: string;
         };
     };
     publishedAt: string;
     channelTitle: string;
     channelId: string;
     categoryId: string;
     tags?: string[];
 };
 contentDetails: {
     duration: string;
 };
 statistics: {
     viewCount: string;
     likeCount?: string;
     commentCount?: string;
 };
}

interface YouTubeVideoDetailsResponse {
 items: YouTubeVideoDetailsItem[];
}

interface YouTubeChannelDetailsResponse {
 items: {
     id: string;
     snippet: {
         title: string;
         description: string;
         thumbnails: {
             default: { url: string };
             medium: { url: string };
             high: { url: string };
         };
     };
     statistics: {
         subscriberCount: string;
         videoCount: string;
         viewCount: string;
     };
 }[];
}

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

export interface YouTubePlayer {
 destroy(): void;
 loadVideoById(videoId: string): void;
 playVideo(): void;
 pauseVideo(): void;
 stopVideo(): void;
 getPlayerState(): number;
 getCurrentTime(): number;
 getDuration(): number;
 isMuted(): boolean;
 mute(): void;
 unMute(): void;
 setVolume(volume: number): void;
 getVolume(): number;
 setPlaybackQuality(quality: string): void;
 getPlaybackQuality(): string;
}

export interface YouTubeEvent {
 data: number;
 target: YouTubePlayer;
}

export const extractVideoId = (url: string): string | null => {
 const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
 return match ? match[1] : null;
};

interface SearchOptions {
 page?: number;
 tags?: string[];
 pageToken?: string;
}

// ビデオIDを使ってレビュー数を取得する関数
async function getReviewCountForVideoUUID(videoUUID: string): Promise<number> {
 try {
     const { data: reviews, error: reviewError } = await supabase
         .from('video_reviews')
         .select('*', { count: 'exact' })
         .eq('video_id', videoUUID);

     if (reviewError) {
         console.error('レビュー数取得エラー:', reviewError.message, reviewError.details);
         return 0;
     }

     return reviews ? reviews.length : 0;
 } catch (error) {
     console.error('レビュー数取得中に予期せぬエラー:', error);
     return 0;
 }
}

// YouTube IDを使って既存の動画を検索する関数
async function findVideoByYouTubeId(youtubeId: string): Promise<any> {
 const { data, error } = await supabase
   .from('videos')
   .select('*')
   .eq('youtube_id', youtubeId)
   .maybeSingle();
 
 if (error) {
   console.error('動画検索エラー:', error);
   return null;
 }
 
 return data;
}

export const YouTubeAPI = {
 async fetchInitialGenreVideos(genre: string) {
     const searchQueries = {
         music: 'music|音楽',
         gaming: 'gaming|ゲーム実況',
         entertainment: 'entertainment|エンターテイメント',
         education: 'education|講座|レッスン',
         technology: 'technology|テクノロジー|プログラミング',
         lifestyle: 'lifestyle|日常|vlog',
         sports: 'sports|スポーツ',
         news: 'news|ニュース'
     }[genre] || '';

     return await this.searchVideos(searchQueries, 20);
 },

 async searchVideos(
     query: string,
     maxResults: number = 10,
     options: SearchOptions = {}
 ): Promise<{ videos: Video[]; totalResults: number; nextPageToken?: string }> {
     try {
         let searchQuery = query;
         if (options.tags && options.tags.length > 0) {
             searchQuery = `${query} ${options.tags.join(' ')}`;
         }

         const response = await axios.get<YouTubeSearchResponse>(`${BASE_URL}/search`, {
             params: {
                 part: 'snippet',
                 key: API_KEY,
                 q: searchQuery,
                 maxResults: maxResults,
                 pageToken: options.pageToken,
                 type: 'video',
                 regionCode: 'JP',
                 videoEmbeddable: 'true'
             },
             headers: {  // Accept ヘッダーを追加
                 Accept: 'application/json'
             }
         });

         const { items, pageInfo, nextPageToken } = response.data;
         const videoIds = items.map(item => item.id.videoId).filter(Boolean);
         const videoDetails = await this.getVideoDetails(videoIds);

         const videos = await Promise.all(videoDetails.map(async (item: YouTubeVideoDetailsItem) => {
             // まずは既存の動画を検索
             const existingVideo = await findVideoByYouTubeId(item.id);
             
             const genreSlug = categoryToGenre[item.snippet.categoryId] || 'others';
             const { data: genreData } = await supabase
                 .from('genres')
                 .select('id')
                 .eq('slug', genreSlug)
                 .single();

             const createdAt = new Date().toISOString();
             const viewCount = parseInt(item.statistics.viewCount);
             const likeCount = item.statistics.likeCount ? parseInt(item.statistics.likeCount) : 0;
             const rating = likeCount ? (likeCount / viewCount) * 5 : 0;

             let dbVideo;
             let review_count = 0;
             
             if (existingVideo) {
                 // 既存の動画が見つかった場合
                 dbVideo = existingVideo;
                 review_count = dbVideo.review_count || 0;
             } else {
                 // 新しい動画の場合、upsertを使用して重複エラーを防ぐ
                 const { data: newVideo, error: insertError } = await supabase
                     .from('videos')
                     .upsert({
                         youtube_id: item.id,
                         title: item.snippet.title,
                         description: item.snippet.description,
                         thumbnail: item.snippet.thumbnails.medium.url,
                         duration: this.formatDuration(item.contentDetails.duration),
                         view_count: viewCount,
                         rating: Number(rating.toFixed(2)),
                         published_at: item.snippet.publishedAt,
                         channel_title: item.snippet.channelTitle,
                         genre_id: genreData?.id,
                         created_at: createdAt,
                         updated_at: createdAt,
                         review_count: 0 // 初期値は0
                     }, {
                         onConflict: 'youtube_id', // youtube_idでの競合を処理
                         ignoreDuplicates: false // 更新を行う
                     })
                     .select();

                 if (insertError) {
                     console.error('動画保存エラー:', insertError);
                     return null;
                 }
                 
                 dbVideo = newVideo?.[0];
                 
                 // レビュー数を取得して更新
                 if (dbVideo) {
                     review_count = await getReviewCountForVideoUUID(dbVideo.id);
                     if (review_count > 0) {
                         await supabase
                             .from('videos')
                             .update({ review_count })
                             .eq('id', dbVideo.id);
                         dbVideo.review_count = review_count;
                     }
                 }
             }

             if (!dbVideo) {
                 return null;
             }

             console.log(`動画ID: ${item.id}, レビュー数: ${review_count}`);

             const video: Video = {
                 id: dbVideo.id,
                 youtube_id: item.id,
                 title: item.snippet.title,
                 description: item.snippet.description,
                 thumbnail: item.snippet.thumbnails.medium.url,
                 duration: this.formatDuration(item.contentDetails.duration),
                 view_count: viewCount,
                 rating: Number(rating.toFixed(2)),
                 published_at: item.snippet.publishedAt,
                 channel_title: item.snippet.channelTitle,
                 genre_id: genreData?.id,
                 created_at: createdAt,
                 updated_at: createdAt,
                 review_count: review_count,
                 youtuber: {
                     channelName: item.snippet.channelTitle,
                     channelUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`,
                     verificationStatus: 'unknown'
                 }
             };

             return video;
         }));

         // nullをフィルタリング
         const filteredVideos = videos.filter((video): video is Video => video !== null);

         return {
             videos: filteredVideos,
             totalResults: pageInfo.totalResults,
             nextPageToken
         };
     } catch (err) {
         console.error('Error searching videos:', err);
         return { videos: [], totalResults: 0 };
     }
 },

 getVideoDetails: async (ids: string | string[]): Promise<YouTubeVideoDetailsItem[]> => {
     if (!ids) return [];
     try {
         const response = await axios.get<YouTubeVideoDetailsResponse>(`${BASE_URL}/videos`, {
             params: {
                 part: 'snippet,contentDetails,statistics',
                 key: API_KEY,
                 id: Array.isArray(ids) ? ids.join(',') : ids,
             },
             headers: {  // Accept ヘッダーを追加
                 Accept: 'application/json'
             }
         });
         return response.data.items;
     } catch (error: any) {
         console.error('Error fetching video details:', error);
         return [];
     }
 },

 formatDuration: (duration: string): string => {
     try {
         const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
         if (!match) return '0:00';
         const hours = parseInt(match[1] || '0', 10) || 0;
         const minutes = parseInt(match[2] || '0', 10) || 0;
         const seconds = parseInt(match[3] || '0', 10) || 0;

         const totalMinutes = hours * 60 + minutes;
         const formattedMinutes = String(totalMinutes).padStart(2, '0');
         const formattedSeconds = String(seconds).padStart(2, '0');

         return `${formattedMinutes}:${formattedSeconds}`;
     } catch (err) {
         console.error('Error formatting duration:', err);
         return '0:00';
     }
 },

 async fetchChannelVideos(channelId: string, maxResults = 50) {
     try {
         const response = await axios.get<YouTubeSearchResponse>(`${BASE_URL}/search`, {
             params: {
                 part: 'snippet',
                 channelId: channelId,
                 maxResults: maxResults,
                 type: 'video',
                 key: API_KEY
             }
         });

         const videoIds = response.data.items.map(item => item.id.videoId);
         return this.getVideoDetails(videoIds);
     } catch (error) {
         console.error('Error fetching channel videos:', error);
         throw new Error('チャンネル動画の取得中にエラーが発生しました');
     }
 },

 async getChannelDetails(channelId: string) {
     try {
         const response = await axios.get<YouTubeChannelDetailsResponse>(`${BASE_URL}/channels`, {
             params: {
                 part: 'snippet,statistics',
                 id: channelId,
                 key: API_KEY
             }
         });

         const channel = response.data.items[0];
         if (!channel) throw new Error('Channel not found');

         return {
             title: channel.snippet.title,
             description: channel.snippet.description,
             thumbnails: channel.snippet.thumbnails,
             subscriberCount: channel.statistics.subscriberCount,
             videoCount: channel.statistics.videoCount,
             viewCount: channel.statistics.viewCount
         };
     } catch (error) {
         console.error('Error fetching channel details:', error);
         throw new Error('チャンネル情報の取得に失敗しました');
     }
 },
};

export const YouTuberSync = {
 async syncYoutuberChannel(channelUrl: string) {
     try {
         const channelId = this.extractChannelId(channelUrl);
         const channelDetails = await YouTubeAPI.getChannelDetails(channelId);

         const { data, error } = await supabase
             .from('youtuber_profiles')
             .upsert({
                 channel_name: channelDetails.title,
                 channel_url: channelUrl,
                 channel_description: channelDetails.description,
                 verification_status: 'pending',
                 channel_id: channelId,
                 avatar_url: channelDetails.thumbnails.default.url,
                 subscribers: parseInt(channelDetails.subscriberCount),
                 video_count: parseInt(channelDetails.videoCount),
                 total_views: parseInt(channelDetails.viewCount)
             })
             .select();

         if (error) throw error;

         return data?.[0];
     } catch (error) {
         console.error('チャンネル同期エラー:', error);
         throw error;
     }
 },

 async syncYoutuberVideos(channelId: string, maxResults = 50) {
     try {
         const videos = await YouTubeAPI.fetchChannelVideos(channelId, maxResults);
         const syncResults = await Promise.all(
             videos.map(video => this.syncSingleVideo(video))
         );
         return syncResults.filter(result => result !== null);
     } catch (error) {
         console.error('動画同期エラー:', error);
         throw error;
     }
 },

 async syncSingleVideo(video: YouTubeVideoDetailsItem) {
     try {
         // まずは既存の動画を検索
         const existingVideo = await findVideoByYouTubeId(video.id);
         
         const genreSlug = categoryToGenre[video.snippet.categoryId] || 'others';
         const { data: genreData } = await supabase
             .from('genres')
             .select('id')
             .eq('slug', genreSlug)
             .single();

         const createdAt = new Date().toISOString();
         const viewCount = parseInt(video.statistics.viewCount);
         const likeCount = video.statistics.likeCount ? parseInt(video.statistics.likeCount) : 0;
         const rating = likeCount ? (likeCount / viewCount) * 5 : 0;

         let dbVideo;
         
         if (existingVideo) {
             // 既存の動画が見つかった場合は更新
             const { data: updatedVideo, error: updateError } = await supabase
                 .from('videos')
                 .update({
                     title: video.snippet.title,
                     description: video.snippet.description,
                     thumbnail: video.snippet.thumbnails.medium.url,
                     duration: YouTubeAPI.formatDuration(video.contentDetails.duration),
                     view_count: viewCount,
                     rating: rating,
                     genre_id: genreData?.id,
                     channel_title: video.snippet.channelTitle,
                     updated_at: createdAt
                 })
                 .eq('id', existingVideo.id)
                 .select();
             
             if (updateError) {
                 console.error('動画更新エラー:', updateError);
                 return null;
             }
             
             dbVideo = updatedVideo?.[0];
         } else {
             // 新しい動画の場合、upsertを使用して重複エラーを防ぐ
             const { data: newVideo, error: insertError } = await supabase
                 .from('videos')
                 .upsert({
                     youtube_id: video.id,
                     title: video.snippet.title,
                     description: video.snippet.description,
                     thumbnail: video.snippet.thumbnails.medium.url,
                     duration: YouTubeAPI.formatDuration(video.contentDetails.duration),
                     view_count: viewCount,
                     rating: rating,
                     genre_id: genreData?.id,
                     published_at: video.snippet.publishedAt,
                     channel_title: video.snippet.channelTitle,
                     created_at: createdAt,
                     updated_at: createdAt,
                     review_count: 0 // 初期値は0
                 }, {
                     onConflict: 'youtube_id', // youtube_idでの競合を処理
                     ignoreDuplicates: false // 更新を行う
                 })
                 .select();
             
             if (insertError) {
                 console.error('動画保存エラー:', insertError);
                 return null;
             }
             
             dbVideo = newVideo?.[0];
         }
         
         // レビュー数を取得して更新
         if (dbVideo) {
             const review_count = await getReviewCountForVideoUUID(dbVideo.id);
             if (review_count > 0) {
                 await supabase
                     .from('videos')
                     .update({ review_count })
                     .eq('id', dbVideo.id);
                 dbVideo.review_count = review_count;
             }
         }

         return dbVideo;
     } catch (error) {
         console.error('動画同期エラー:', error);
         throw error;
     }
 },

 extractChannelId(channelUrl: string): string {
     const match = channelUrl.match(/(?:channel\/|@)([^/]+)/);
     if (!match) throw new Error('無効なチャンネルURL');
     return match[1];
 }
};