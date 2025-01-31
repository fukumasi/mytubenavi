import axios from 'axios';
import type { Video } from '../types';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
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
    };
}

interface YouTubeSearchResponse {
    items: YouTubeSearchItem[];
    pageInfo: {
        totalResults: number;
    };
    nextPageToken?: string;
}

interface YouTubeVideoDetailsItem {
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


export const extractVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
};

export const YouTubeAPI = {
    async searchVideos(
        query: string,
        maxResults: number = 10,
        pageToken?: string
    ): Promise<{ videos: Video[]; totalResults: number; nextPageToken?: string }> {
        try {
            const response = await axios.get<YouTubeSearchResponse>(`${BASE_URL}/search`, {
                params: {
                    part: 'snippet',
                    key: API_KEY,
                    q: query,
                    maxResults: maxResults,
                    pageToken: pageToken,
                    type: 'video',
                },
            });
            const { items, pageInfo, nextPageToken } = response.data;

            const videoIds = items.map((item: YouTubeSearchItem) => item.id.videoId).filter(Boolean);
            const videoDetails = await this.getVideoDetails(videoIds);
          
            const videos = videoDetails.map((item: YouTubeVideoDetailsItem) => ({
                 id: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.medium.url,
                duration: this.formatDuration(item.contentDetails.duration),
                viewCount: parseInt(item.statistics.viewCount),
                rating: item.statistics.likeCount
                    ? (parseInt(item.statistics.likeCount) / parseInt(item.statistics.viewCount || '1')) * 5
                    : 0,
                publishedAt: item.snippet.publishedAt,
                channelTitle: item.snippet.channelTitle,
                commentCount: parseInt(item.statistics.commentCount || '0'),
                youtubeId: item.id,
                 youtuber: {
                    channelName: item.snippet.channelTitle,
                    channelUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`,
                     verificationStatus: 'unknown' as 'unknown'
                }
            }));


            return {
                videos,
                totalResults: pageInfo.totalResults,
                nextPageToken: nextPageToken,
            };
        } catch (err) {
            console.error('Error searching videos:', err);
            return { videos: [], totalResults: 0 };
        }
    },
    async getVideoDetails(ids: string | string[]): Promise<YouTubeVideoDetailsItem[]> {
        if (!ids) {
            return [];
        }
        try {
            const response = await axios.get<YouTubeVideoDetailsResponse>(`${BASE_URL}/videos`, {
                params: {
                    part: 'snippet,contentDetails,statistics',
                    key: API_KEY,
                    id: Array.isArray(ids) ? ids.join(',') : ids,
                },
            });
            return response.data.items;
        } catch (error) {
            console.error('Error fetching video details:', error);
            return [];
        }
    },
    formatDuration(duration: string): string {
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
};