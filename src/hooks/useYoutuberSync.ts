// src/hooks/useYoutuberSync.ts
import { useState, useCallback } from 'react';
import { YouTubeSyncService } from '../services/youtube-sync.service';
import { SyncStatus, YouTuberSyncResult } from '../types/youtuber';

const youtubeSyncService = new YouTubeSyncService();

export function useYoutuberSync() {
   const [syncStatus, setSyncStatus] = useState<SyncStatus>({
       status: 'idle',
       message: '',
       lastSyncedAt: undefined,
       error: undefined
   });

   const syncChannel = useCallback(async (channelUrl: string): Promise<YouTuberSyncResult> => {
       setSyncStatus({ status: 'syncing', message: 'チャンネル同期中...', lastSyncedAt: undefined });

       try {
           const profile = await youtubeSyncService.syncChannelProfile(channelUrl);
           const channelId = youtubeSyncService.extractChannelId(channelUrl);
           const videos = await youtubeSyncService.syncChannelVideos(channelId);

           const result: YouTuberSyncResult = {
               profile,
               syncedVideosCount: videos.length,
               syncedAt: new Date()
           };

           setSyncStatus({ 
               status: 'success', 
               message: `${videos.length}本の動画を同期しました`, 
               lastSyncedAt: new Date() 
           });

           return result;
       } catch (error) {
           const errorMessage = error instanceof Error ? error.message : '同期中にエラーが発生しました';
           
           setSyncStatus({ 
               status: 'error', 
               message: errorMessage, 
               error: error instanceof Error ? error : undefined 
           });

           throw error;
       }
   }, []);

   const resyncChannel = useCallback(async (channelId: string): Promise<number> => {
       setSyncStatus({ status: 'syncing', message: '動画再同期中...', lastSyncedAt: undefined });

       try {
           const videos = await youtubeSyncService.syncChannelVideos(channelId);

           setSyncStatus({ 
               status: 'success', 
               message: `${videos.length}本の動画を再同期しました`, 
               lastSyncedAt: new Date() 
           });

           return videos.length;
       } catch (error) {
           const errorMessage = error instanceof Error ? error.message : '再同期中にエラーが発生しました';
           
           setSyncStatus({ 
               status: 'error', 
               message: errorMessage, 
               error: error instanceof Error ? error : undefined 
           });

           throw error;
       }
   }, []);

   return {
       syncStatus,
       syncChannel,
       resyncChannel
   };
}