const { google } = require('googleapis');
const Video = require('../models/Video');

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

exports.searchVideos = async (query, maxResults = 10) => {
  try {
    const response = await youtube.search.list({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults
    });

    return response.data.items;
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
};

exports.getVideoDetails = async (videoId) => {
  try {
    const response = await youtube.videos.list({
      part: 'snippet,statistics,contentDetails',
      id: videoId
    });

    return response.data.items[0];
  } catch (error) {
    console.error('Error getting video details:', error);
    throw error;
  }
};

exports.saveVideoToDatabase = async (videoData) => {
  const { id, snippet, statistics, contentDetails } = videoData;

  try {
    let video = await Video.findOne({ videoId: id });
    if (video) {
      // Update existing video
      video.title = snippet.title;
      video.description = snippet.description;
      video.thumbnailUrl = snippet.thumbnails.high.url;
      video.viewCount = statistics.viewCount;
      video.likeCount = statistics.likeCount;
      video.commentCount = statistics.commentCount;
      await video.save();
    } else {
      // Create new video
      video = new Video({
        videoId: id,
        title: snippet.title,
        description: snippet.description,
        thumbnailUrl: snippet.thumbnails.high.url,
        channelTitle: snippet.channelTitle,
        publishedAt: snippet.publishedAt,
        viewCount: statistics.viewCount,
        likeCount: statistics.likeCount,
        commentCount: statistics.commentCount,
        duration: contentDetails.duration,
        tags: snippet.tags || [],
        category: snippet.categoryId
      });
      await video.save();
    }
    return video;
  } catch (error) {
    console.error('Error saving video to database:', error);
    throw error;
  }
};