// src/services/youtube-sync.service.ts
import { createClient } from '@supabase/supabase-js';
import { YouTubeAPI, YouTubeVideoDetailsItem } from '../lib/youtube';
import { YouTuberProfile, YouTubeVideo, YouTuberChannelDetails } from '../types/youtuber';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class YouTubeSyncService {
 async syncChannelVideos(channelId: string, maxResults = 50): Promise<YouTubeVideo[]> {
     try {
         const videos = await YouTubeAPI.fetchChannelVideos(channelId, maxResults);
         return Promise.all(videos.map(video => this.syncSingleVideo(video)));
     } catch (error) {
         console.error('チャンネル動画同期エラー:', error);
         throw error;
     }
 }

 private async syncSingleVideo(video: YouTubeVideoDetailsItem): Promise<YouTubeVideo> {
   try {
       const genreSlug = this.mapCategoryToGenre(video.snippet.categoryId);
       const { data: genreData, error: genreError } = await supabase
           .from('genres')
           .select('id')
           .eq('slug', genreSlug)
           .single();

       if (genreError) throw genreError;

       // レビュー数を取得
       const { count: reviewCount, error: reviewError } = await supabase
           .from('reviews')
           .select('*', { count: 'exact', head: true })
           .eq('video_id', video.id);

       if (reviewError) throw reviewError;

       const createdAt = new Date().toISOString();
       const viewCount = parseInt(video.statistics.viewCount);
       const likeCount = video.statistics.likeCount ? parseInt(video.statistics.likeCount) : 0;
       const rating = likeCount ? (likeCount / viewCount) * 5 : 0;

       const { data, error } = await supabase
           .from('videos')
           .upsert({
               id: video.id,
               title: video.snippet.title,
               description: video.snippet.description,
               thumbnail: video.snippet.thumbnails.medium.url,
               duration: YouTubeAPI.formatDuration(video.contentDetails.duration),
               view_count: viewCount,
               rating: rating,
               genre_id: genreData?.id,
               published_at: video.snippet.publishedAt,
               channel_title: video.snippet.channelTitle,
               review_count: reviewCount || 0,
               youtube_id: video.id,
               created_at: createdAt,
               updated_at: createdAt,
               channel_id: video.snippet.channelId
           })
           .select()
           .single();

       if (error) throw error;
       return data as YouTubeVideo;
   } catch (error) {
       console.error('動画同期エラー:', error);
       throw error;
   }
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
         const channelId = this.extractChannelId(channelUrl);
         const channelDetails = await YouTubeAPI.getChannelDetails(channelId) as YouTuberChannelDetails;

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
                 total_views: parseInt(channelDetails.viewCount),
                 created_at: new Date().toISOString(),
                 updated_at: new Date().toISOString()
             })
             .select()
             .single();

         if (error) throw error;
         return data as YouTuberProfile;
     } catch (error) {
         console.error('チャンネル同期エラー:', error);
         throw error;
     }
 }

 public extractChannelId(channelUrl: string): string {
     const match = channelUrl.match(/(?:channel\/|@)([^/]+)/);
     if (!match) throw new Error('無効なチャンネルURL');
     return match[1];
 }
}

export const youtubeSyncService = new YouTubeSyncService();