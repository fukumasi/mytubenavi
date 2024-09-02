const { createClient } = require('redis');
const { google } = require("googleapis");
const Video = require("../models/Video");
require("dotenv").config();
const NodeCache = require("node-cache");
const rateLimit = require("express-rate-limit");
const AsyncLock = require('async-lock');
const Queue = require('bull');
const apiRequestQueue = new Queue('YouTube API Requests', process.env.REDIS_URL);

let redisClient;

// Redis初期化関数
async function initRedis() {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      host: 'localhost',
      port: 6379,
      reconnectStrategy: retries => Math.min(retries * 50, 1000)
    }
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
    if (!global.inMemoryCache) {
      global.inMemoryCache = new Map();
    }
  });

  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    global.inMemoryCache = new Map();
  }
}

initRedis().catch(console.error);

const cache = new NodeCache({ stdTTL: 28800, checkperiod: 2880 });
const lock = new AsyncLock();

const API_KEYS = process.env.YOUTUBE_API_KEYS ? process.env.YOUTUBE_API_KEYS.split(',') : [process.env.YOUTUBE_API_KEY];
let currentKeyIndex = 0;

const apiKeyUsage = new Map();

// キューの処理
apiRequestQueue.process('search', async (job) => {
  return await executeApiRequest('search', job.data.params);
});

apiRequestQueue.process('videos', async (job) => {
  return await executeApiRequest('videos', job.data.params);
});

apiRequestQueue.process('commentThreads', async (job) => {
  return await executeApiRequest('commentThreads', job.data.params);
});

async function executeApiRequest(action, params) {
  const youtube = await createYoutubeClient();
  switch (action) {
    case 'search':
      return await youtube.search.list(params);
    case 'videos':
      return await youtube.videos.list(params);
    case 'commentThreads':
      return await youtube.commentThreads.list(params);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// APIキー使用状況の追跡を改善
function trackApiKeyUsage(key, units) {
  const usage = apiKeyUsage.get(key) || { count: 0, quota: 0, lastUsed: 0 };
  usage.count += 1;
  usage.quota += units;
  usage.lastUsed = Date.now();
  apiKeyUsage.set(key, usage);
}

// APIキーのローテーション戦略を改善
const API_KEY_QUOTA_LIMIT = 10000;
const API_KEY_QUOTA_THRESHOLD = API_KEY_QUOTA_LIMIT * 0.8;
const getAvailableApiKey = async () => {
  return lock.acquire('apiKey', () => {
    const now = Date.now();
    let leastUsedKey = null;
    let leastUsage = Infinity;

    for (const key of API_KEYS) {
      const usage = apiKeyUsage.get(key) || { count: 0, quota: 0, lastUsed: 0 };
      if (now - usage.lastUsed > 86400000) {
        usage.count = 0;
        usage.quota = 0;
      }
      if (usage.quota < leastUsage) {
        leastUsedKey = key;
        leastUsage = usage.quota;
      }
    }

    if (leastUsedKey) {
      console.log(`Using API key: ${leastUsedKey.slice(0, 5)}...`);
      return leastUsedKey;
    }
    throw new Error('All API keys have exceeded their quota');
  });
};

// createYoutubeClient関数を更新
async function createYoutubeClient() {
  const key = await getAvailableApiKey();
  return google.youtube({
    version: "v3",
    auth: key,
  });
}

// レート制限の設定
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "Too many requests from this IP, please try again after 15 minutes."
});

// 改善されたバックオフ戦略を実装する関数
async function retryWithDynamicBackoff(fn, maxRetries = 5, initialDelay = 1000) {
  let retries = 0;
  let delay = initialDelay;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (error.response && (error.response.status === 429 || error.response.status === 403)) {
        console.log(`API limit hit. Switching key and retrying in ${delay}ms...`);
        await switchToNextApiKey(); // 新しい関数を作成して、次のAPIキーに切り替える
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}

// 新しい関数: APIキーを切り替える
async function switchToNextApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`Switching to next API key: ${API_KEYS[currentKeyIndex].slice(0, 5)}...`);
}

// キャッシュTTLの設定
const CACHE_TTL = {
  search: 86400, // 24時間
  videoDetails: 604800, // 7日間
  relatedVideos: 86400, // 24時間
  featuredVideos: 43200, // 12時間
  comments: 3600 // 1時間
};

// キャッシュ取得または新規フェッチ関数の改善
async function getCachedOrFetch(cacheKey, fetchFunction, ttl = 28800) {
  // まずメモリキャッシュをチェック
  const memoryResult = cache.get(cacheKey);
  if (memoryResult) {
    updateCacheStats(true, 'memory');
    return memoryResult;
  }

  // 次にRedisキャッシュをチェック
  try {
    const redisResult = await redisClient.get(cacheKey);
    if (redisResult) {
      updateCacheStats(true, 'redis');
      // メモリキャッシュも更新
      cache.set(cacheKey, JSON.parse(redisResult), ttl);
      return JSON.parse(redisResult);
    }
  } catch (error) {
    console.error('Redis error:', error);
  }

  // キャッシュミスの場合、新しいデータをフェッチ
  updateCacheStats(false);
  try {
    const result = await fetchFunction();
    // Redisキャッシュを更新
    await redisClient.set(cacheKey, JSON.stringify(result), 'EX', ttl);
    // メモリキャッシュも更新
    cache.set(cacheKey, result, ttl);
    return result;
  } catch (error) {
    console.error('Fetch error:', error);
    return getDummyData(cacheKey);
  }
}

// レート制限とスロットリングの改善
const RATE_LIMIT_WINDOW = 1000; // 1秒
const MAX_REQUESTS_PER_WINDOW = 3; // 1秒あたり3リクエスト
let requestsInCurrentWindow = 0;
let windowStart = Date.now();

async function throttledApiRequest(action, params) {
  const now = Date.now();
  if (now - windowStart > RATE_LIMIT_WINDOW) {
    requestsInCurrentWindow = 0;
    windowStart = now;
  }

  if (requestsInCurrentWindow >= MAX_REQUESTS_PER_WINDOW) {
    const delay = RATE_LIMIT_WINDOW - (now - windowStart) + Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay));
    return throttledApiRequest(action, params);
  }

  requestsInCurrentWindow++;
  return apiRequestQueue.add({ action, params });
}

// 検索機能の改善
exports.searchVideos = async (query, maxResults = 50, pageToken = null) => {
  const cacheKey = `search_${query}_${maxResults}_${pageToken || 'initial'}`;

  return getCachedOrFetch(cacheKey, async () => {
    return retryWithDynamicBackoff(async () => {
      const response = await throttledApiRequest('search', {
        part: "snippet",
        q: query,
        type: "video",
        maxResults: Math.min(maxResults, 50),
        pageToken: pageToken,
        order: "relevance",
        safeSearch: "moderate",
        videoEmbeddable: "true",
        fields: "items(id/videoId,snippet(title,thumbnails/medium,channelTitle)),nextPageToken,prevPageToken,pageInfo",
      });
      trackApiKeyUsage(response.config.params.key, 100);

      return {
        items: response.data.items.map(item => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          channelTitle: item.snippet.channelTitle,
        })),
        nextPageToken: response.data.nextPageToken,
        prevPageToken: response.data.prevPageToken,
        totalResults: response.data.pageInfo.totalResults,
      };
    });
  }, CACHE_TTL.search);
};

// ビデオ詳細取得機能の改善
exports.getVideoDetails = async (videoId) => {
  const cacheKey = `video_${videoId}`;

  return getCachedOrFetch(cacheKey, async () => {
    if (videoId.startsWith('video')) {
      return getDummyVideoDetails(videoId);
    }

    return retryWithDynamicBackoff(async () => {
      const job = await apiRequestQueue.add('videos', {
        action: 'videos',
        params: {
          part: "snippet,statistics,contentDetails",
          id: videoId,
          fields: "items(id,snippet(title,description,channelTitle,publishedAt,thumbnails/medium),statistics(viewCount,likeCount,commentCount),contentDetails/duration)"
        }
      });
      const response = await job.finished();
      trackApiKeyUsage(response.config.params.key, 1);

      if (response.data.items.length === 0) {
        throw new Error("Video not found");
      }

      return response.data.items[0];
    });
  }, CACHE_TTL.videoDetails);
};

// 関連動画取得機能の改善
exports.getRelatedVideos = async (videoId, maxResults = 10) => {
  const cacheKey = `related_${videoId}_${maxResults}`;

  return getCachedOrFetch(cacheKey, async () => {
    if (!videoId || videoId.startsWith('dummy')) {
      return getDummyRelatedVideos(maxResults);
    }

    if (!isValidVideoId(videoId)) {
      throw new Error("Invalid video ID");
    }

    return retryWithDynamicBackoff(async () => {
      const job = await apiRequestQueue.add('search', {
        action: 'search',
        params: {
          part: "snippet",
          type: "video",
          maxResults: Math.min(maxResults, 50),
          relatedToVideoId: videoId,
          fields: "items(id/videoId,snippet(title,thumbnails/medium,channelTitle))"
        }
      });
      const response = await job.finished();
      trackApiKeyUsage(response.config.params.key, 100);

      return response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
      }));
    });
  }, CACHE_TTL.relatedVideos);
};

// 注目動画取得機能の改善
exports.getFeaturedVideos = async (maxResults = 10, pageToken = null) => {
  const cacheKey = `featured_${maxResults}_${pageToken || 'initial'}`;

  return getCachedOrFetch(cacheKey, async () => {
    return retryWithDynamicBackoff(async () => {
      const job = await apiRequestQueue.add('videos', {
        action: 'videos',
        params: {
          part: "snippet,statistics",
          chart: "mostPopular",
          regionCode: "JP",
          maxResults: Math.min(maxResults, 50),
          pageToken: pageToken,
          fields: "items(id,snippet(title,thumbnails/medium,channelTitle),statistics/viewCount),nextPageToken,prevPageToken"
        }
      });
      const response = await job.finished();
      trackApiKeyUsage(response.config.params.key, 1);

      const featuredVideos = response.data.items.map(video => ({
        id: video.id,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.medium.url,
        channelTitle: video.snippet.channelTitle,
        viewCount: video.statistics.viewCount,
      }));

      return {
        items: featuredVideos,
        nextPageToken: response.data.nextPageToken,
        prevPageToken: response.data.prevPageToken,
      };
    });
  }, CACHE_TTL.featuredVideos);
};

// 新しい関数: コメント取得機能
exports.getVideoComments = async (videoId, maxResults = 20, pageToken = null) => {
  const cacheKey = `comments_${videoId}_${maxResults}_${pageToken || 'initial'}`;

  return getCachedOrFetch(cacheKey, async () => {
    if (!isValidVideoId(videoId)) {
      throw new Error("Invalid video ID");
    }

    return retryWithDynamicBackoff(async () => {
      const job = await apiRequestQueue.add('commentThreads', {
        action: 'commentThreads',
        params: {
          part: "snippet",
          videoId: videoId,
          maxResults: Math.min(maxResults, 100),
          pageToken: pageToken,
          order: "relevance",
          fields: "items(id,snippet(topLevelComment(snippet(textDisplay,authorDisplayName,publishedAt,likeCount)))),nextPageToken,pageInfo"
        }
      });
      const response = await job.finished();
      trackApiKeyUsage(response.config.params.key, 1);

      return {
        items: response.data.items.map(item => ({
          id: item.id,
          text: item.snippet.topLevelComment.snippet.textDisplay,
          author: item.snippet.topLevelComment.snippet.authorDisplayName,
          publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
          likeCount: item.snippet.topLevelComment.snippet.likeCount,
        })),
        nextPageToken: response.data.nextPageToken,
        totalResults: response.data.pageInfo.totalResults,
      };
    });
  }, CACHE_TTL.comments);
};

// APIエラーハンドリング関数の改善
function handleApiError(error, action) {
  console.error(`Error ${action}:`, error);
  if (error.response && error.response.data) {
    console.error("YouTube API error details:", error.response.data);
  }
  if (isQuotaExceededError(error)) {
    console.warn("YouTube API quota exceeded. Using dummy data.");
    return { error: "YouTube API quota exceeded. Using dummy data.", dummy: true };
  }
  if (error.response && error.response.status === 429) {
    console.warn("Rate limit exceeded. Using dummy data.");
    return { error: "Rate limit exceeded. Using dummy data.", dummy: true };
  }
  return { error: `An error occurred while ${action}. Using dummy data.`, dummy: true };
}

// クォータ超過エラーチェック関数
function isQuotaExceededError(error) {
  return error.response && 
         error.response.status === 403 && 
         error.response.data.error.errors[0].reason === "quotaExceeded";
}

// ビデオID検証関数
function isValidVideoId(id) {
  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  return videoIdPattern.test(id);
}

// ダミービデオ詳細生成関数
function getDummyVideoDetails(videoId) {
  const dummyCategories = ['Music', 'Gaming', 'News', 'Education', 'Entertainment'];
  const dummyTags = ['popular', 'trending', 'viral', 'new', 'best'];
  return {
    id: videoId,
    snippet: {
      title: `ダミー動画 ${videoId} - ${dummyCategories[Math.floor(Math.random() * dummyCategories.length)]}`,
      description: `これはダミー動画 ${videoId} の説明です。実際のデータを取得できなかったため、代替データを表示しています。この動画は ${dummyTags[Math.floor(Math.random() * dummyTags.length)]} なコンテンツです。`,
      channelTitle: `ダミーチャンネル ${Math.floor(Math.random() * 1000)}`,
      publishedAt: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
      thumbnails: {
        medium: {
          url: `https://picsum.photos/320/180?random=${videoId}`,
        },
      },
    },
    statistics: {
      viewCount: Math.floor(Math.random() * 10000000).toString(),
      likeCount: Math.floor(Math.random() * 100000).toString(),
      commentCount: Math.floor(Math.random() * 10000).toString(),
    },
    contentDetails: {
      duration: `PT${Math.floor(Math.random() * 60)}M${Math.floor(Math.random() * 60)}S`,
    },
  };
}

// ダミー関連動画生成関数
function getDummyRelatedVideos(maxResults) {
  const dummyCategories = ['Music', 'Gaming', 'News', 'Education', 'Entertainment'];
  return Array.from({ length: maxResults }, (_, i) => ({
    id: `dummy_related_${i + 1}`,
    title: `関連動画 ${i + 1} - ${dummyCategories[Math.floor(Math.random() * dummyCategories.length)]} (ダミーデータ)`,
    thumbnail: `https://picsum.photos/200/150?random=${i + 1}`,
    channelTitle: `ダミーチャンネル ${Math.floor(Math.random() * 1000)}`,
  }));
}

// ダミー検索結果生成関数
function getDummySearchResults(query, maxResults) {
  const dummyCategories = ['Music', 'Gaming', 'News', 'Education', 'Entertainment'];
  return {
    items: Array.from({ length: maxResults }, (_, i) => ({
      id: `dummy_search_${i + 1}`,
      title: `"${query}" の検索結果 ${i + 1} - ${dummyCategories[Math.floor(Math.random() * dummyCategories.length)]} (代替データ)`,
      thumbnail: `https://picsum.photos/320/180?random=${i}`,
      channelTitle: `ダミーチャンネル ${Math.floor(Math.random() * 1000)}`,
    })),
    nextPageToken: 'dummy_next_page_token',
    prevPageToken: null,
    totalResults: maxResults * 10,
    isDummyData: true
  };
}

// ダミー注目動画生成関数
function getDummyFeaturedVideos(maxResults) {
  const dummyCategories = ['Music', 'Gaming', 'News', 'Education', 'Entertainment'];
  return {
    items: Array.from({ length: maxResults }, (_, i) => ({
      id: `dummy_featured_${i + 1}`,
      title: `注目のダミー動画 ${i + 1} - ${dummyCategories[Math.floor(Math.random() * dummyCategories.length)]} (代替データ)`,
      thumbnail: `https://picsum.photos/320/180?random=${i}`,
      channelTitle: `人気チャンネル ${Math.floor(Math.random() * 1000)}`,
      viewCount: Math.floor(Math.random() * 10000000).toString(),
    })),
    nextPageToken: 'dummy_next_page_token',
    prevPageToken: null,
  };
}

// ダミーコメント生成関数
function getDummyComments(maxResults) {
  return {
    items: Array.from({ length: maxResults }, (_, i) => ({
      id: `dummy_comment_${i + 1}`,
      text: `これはダミーコメント ${i + 1} です。実際のデータを取得できなかったため、代替データを表示しています。`,author: `ダミーユーザー${Math.floor(Math.random() * 1000)}`,
      publishedAt: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
      likeCount: Math.floor(Math.random() * 1000),
    })),
    nextPageToken: 'dummy_next_page_token',
    totalResults: maxResults * 10,
    isDummyData: true
  };
}

// API状態チェック関数
exports.checkApiStatus = async () => {
  try {
    const job = await apiRequestQueue.add('search', {
      action: 'search',
      params: {
        part: "snippet",
        q: "test",
        type: "video",
        maxResults: 1,
      }
    });
    const response = await job.finished();
    trackApiKeyUsage(response.config.params.key, 100);
    return true;
  } catch (error) {
    console.error("YouTube API status check failed:", error);
    return false;
  }
};

// キャッシュ統計取得関数
exports.getCacheStats = async () => {
  try {
    const redisKeys = await redisClient.keys('*');
    const memoryKeys = cache.keys();
    return {
      redisKeys: redisKeys.length,
      memoryKeys: memoryKeys.length,
      hitRate: exports.getCacheHitRate().toFixed(2)
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { redisKeys: 0, memoryKeys: 0, hitRate: 0, error: 'Failed to get cache stats' };
  }
};

// キャッシュクリア関数
exports.clearCache = async () => {
  try {
    await redisClient.flushAll();
    cache.flushAll();
    console.log('Cache cleared');
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return { success: false, error: 'Failed to clear cache' };
  }
};

// APIキー使用状況レポート生成関数
exports.getApiKeyUsageReport = () => {
  const report = [];
  for (const [key, usage] of apiKeyUsage.entries()) {
    report.push({ 
      key: key.slice(0, 5) + '...', 
      count: usage.count, 
      quota: usage.quota,
      lastUsed: new Date(usage.lastUsed).toISOString()
    });
  }
  return report;
};

// リトライ付き検索関数
exports.searchVideosWithRetry = (query, maxResults = 50, pageToken = null) => 
  retryWithDynamicBackoff(() => exports.searchVideos(query, maxResults, pageToken));

// リトライ付きビデオ詳細取得関数
exports.getVideoDetailsWithRetry = (videoId) => 
  retryWithDynamicBackoff(() => exports.getVideoDetails(videoId));

// リトライ付き関連動画取得関数
exports.getRelatedVideosWithRetry = (videoId, maxResults = 10) => 
  retryWithDynamicBackoff(() => exports.getRelatedVideos(videoId, maxResults));

// リトライ付き注目動画取得関数
exports.getFeaturedVideosWithRetry = (maxResults = 10, pageToken = null) => 
  retryWithDynamicBackoff(() => exports.getFeaturedVideos(maxResults, pageToken));

// リトライ付きコメント取得関数
exports.getVideoCommentsWithRetry = (videoId, maxResults = 20, pageToken = null) => 
  retryWithDynamicBackoff(() => exports.getVideoComments(videoId, maxResults, pageToken));

// APIキークォータ使用量リセット関数
exports.resetApiKeyQuotaUsage = () => {
  for (const key of API_KEYS) {
    apiKeyUsage.set(key, { count: 0, quota: 0, lastUsed: Date.now() });
  }
  console.log('API key quota usage reset');
};

// 日次クォータリセット関数
const resetQuotaDaily = () => {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0
  );
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    exports.resetApiKeyQuotaUsage();
    resetQuotaDaily();
  }, msToMidnight);
};

resetQuotaDaily();

// パフォーマンスモニタリング関数
const performanceMonitor = {
  start: (action) => {
    const start = process.hrtime();
    return () => {
      const end = process.hrtime(start);
      const duration = (end[0] * 1000 + end[1] / 1e6).toFixed(2);
      console.log(`Performance: ${action} took ${duration}ms`);
      savePerformanceData(action, parseFloat(duration));
    };
  }
};

// 全エクスポート関数にパフォーマンスモニタリングを適用
Object.keys(exports).forEach(key => {
  if (typeof exports[key] === 'function') {
    const originalFunction = exports[key];
    exports[key] = async function(...args) {
      const endPerformanceMonitoring = performanceMonitor.start(key);
      try {
        return await originalFunction.apply(this, args);
      } finally {
        endPerformanceMonitoring();
      }
    };
  }
});

// クォータ警告閾値
const QUOTA_WARNING_THRESHOLD = 0.8 * API_KEY_QUOTA_LIMIT;

// クォータ使用量監視関数
const monitorQuotaUsage = () => {
  for (const [key, usage] of apiKeyUsage.entries()) {
    if (usage.quota > QUOTA_WARNING_THRESHOLD) {
      console.warn(`Warning: API key ${key.slice(0, 5)}... has used ${usage.quota} units, which is over 80% of the daily limit.`);
    }
  }
};

setInterval(monitorQuotaUsage, 3600000);

// APIキーローテーション関数
const rotateApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`Rotating to next API key: ${API_KEYS[currentKeyIndex].slice(0, 5)}...`);
};

setInterval(rotateApiKey, 86400000);

// エラーレポート関数
const reportError = (error, context) => {
  console.error('Error occurred:', error, 'Context:', context);
};

// キャッシュ最適化関数
const optimizeCache = async () => {
  try {
    const redisKeys = await redisClient.keys('*');
    for (const key of redisKeys) {
      const ttl = await redisClient.ttl(key);
      if (ttl < 0) {
        await redisClient.del(key);
      }
    }
    cache.prune();
    console.log('Cache optimization completed');
  } catch (error) {
    console.error('Error optimizing cache:', error);
  }
};

setInterval(optimizeCache, 86400000);

// ダミーデータ取得関数
function getDummyData(cacheKey) {
  if (cacheKey.startsWith('search_')) {
    const [, query, maxResults] = cacheKey.split('_');
    return getDummySearchResults(query, parseInt(maxResults));
  } else if (cacheKey.startsWith('video_')) {
    const videoId = cacheKey.split('_')[1];
    return getDummyVideoDetails(videoId);
  } else if (cacheKey.startsWith('related_')) {
    const [, videoId, maxResults] = cacheKey.split('_');
    return getDummyRelatedVideos(parseInt(maxResults));
  } else if (cacheKey.startsWith('featured_')) {
    const [, maxResults] = cacheKey.split('_');
    return getDummyFeaturedVideos(parseInt(maxResults));
  } else if (cacheKey.startsWith('comments_')) {
    const [, videoId, maxResults] = cacheKey.split('_');
    return getDummyComments(parseInt(maxResults));
  }
  return null;
}

// エラーハンドリング関数
function handleError(error, context) {
  console.error(`Error in ${context}:`, error);
  reportError(error, context);
}

// APIキー使用状況のリセットスケジューリング
function scheduleApiKeyUsageReset() {
  const now = new Date();
  const resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const msUntilReset = resetTime.getTime() - now.getTime();

  setTimeout(() => {
    exports.resetApiKeyQuotaUsage();
    scheduleApiKeyUsageReset();
  }, msUntilReset);
}

scheduleApiKeyUsageReset();

// パフォーマンスデータ保存関数
function savePerformanceData(action, duration) {
  console.log(`Performance data: ${action} took ${duration}ms`);
}

// キャッシュヒット率計算関数
let cacheHits = { memory: 0, redis: 0 };
let cacheMisses = 0;

function updateCacheStats(hit, cacheType = null) {
  if (hit) {
    if (cacheType === 'memory') {
      cacheHits.memory++;
    } else if (cacheType === 'redis') {
      cacheHits.redis++;
    }
  } else {
    cacheMisses++;
  }
}

exports.getCacheHitRate = () => {
  const totalHits = cacheHits.memory + cacheHits.redis;
  const total = totalHits + cacheMisses;
  if (total === 0) return 0;
  return (totalHits / total) * 100;
};

// 定期的なキャッシュヒット率レポート
setInterval(() => {
  const totalHits = cacheHits.memory + cacheHits.redis;
  const total = totalHits + cacheMisses;
  console.log(`Cache hit rate: ${exports.getCacheHitRate().toFixed(2)}%`);
  console.log(`Memory cache hits: ${cacheHits.memory}, Redis cache hits: ${cacheHits.redis}, Cache misses: ${cacheMisses}`);
}, 3600000);

// YouTubeデータAPI使用状況モニタリング
function monitorApiUsage() {
  const totalUsage = Array.from(apiKeyUsage.values()).reduce((sum, usage) => sum + usage.quota, 0);
  const averageUsage = totalUsage / API_KEYS.length;
  console.log(`Average API usage per key: ${averageUsage.toFixed(2)} units`);
  if (averageUsage > API_KEY_QUOTA_LIMIT * 0.8) {
    console.warn('Warning: API usage is approaching the quota limit');
  }
}

setInterval(monitorApiUsage, 3600000);

// APIキー使用状況の詳細レポート
function getDetailedApiKeyUsageReport() {
  const report = [];
  for (const [key, usage] of apiKeyUsage.entries()) {
    const lastUsedDate = new Date(usage.lastUsed);
    report.push({
      key: key.slice(0, 5) + '...',
      count: usage.count,
      quota: usage.quota,
      lastUsed: lastUsedDate.toISOString(),
      quotaPercentage: ((usage.quota / API_KEY_QUOTA_LIMIT) * 100).toFixed(2) + '%'
    });
  }
  return report;
}

// APIキーのローテーションを最適化
const optimizeApiKeyRotation = () => {
  const sortedKeys = Array.from(apiKeyUsage.entries())
    .sort((a, b) => a[1].quota - b[1].quota);
  
  if (sortedKeys.length > 0) {
    const leastUsedKey = sortedKeys[0][0];
    const currentKeyIndex = API_KEYS.indexOf(leastUsedKey);
    if (currentKeyIndex !== -1) {
      console.log(`Optimizing API key rotation. Switching to key: ${leastUsedKey.slice(0, 5)}...`);
      return currentKeyIndex;
    }
  }
  
  return (currentKeyIndex + 1) % API_KEYS.length;
};

// 最適化されたAPIキーローテーション関数
const rotateApiKeyOptimized = () => {
  currentKeyIndex = optimizeApiKeyRotation();
  console.log(`Rotated to API key: ${API_KEYS[currentKeyIndex].slice(0, 5)}...`);
};

setInterval(rotateApiKeyOptimized, 3600000);

// クライアントサイドキャッシュサポート
exports.getClientSideCacheControl = (cacheKey) => {
  if (cacheKey.startsWith('search_')) {
    return 'public, max-age=86400'; // 24時間
  } else if (cacheKey.startsWith('video_')) {
    return 'public, max-age=604800'; // 7日間
  } else if (cacheKey.startsWith('related_')) {
    return 'public, max-age=86400'; // 24時間
  } else if (cacheKey.startsWith('featured_')) {
    return 'public, max-age=43200'; // 12時間
  } else if (cacheKey.startsWith('comments_')) {
    return 'public, max-age=3600'; // 1時間
  }
  return 'no-store';
};

// バッチ処理のためのキュー
const batchUpdateQueue = new Queue('Batch Updates', process.env.REDIS_URL);

// 人気のクエリや動画IDのリスト (例)
const popularQueries = ['music', 'news', 'gaming', 'comedy', 'education'];
const popularVideoIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw', '9bZkp7q19f0']; // 例としての動画ID

// バッチ更新処理
batchUpdateQueue.process(async (job) => {
  const { type, params } = job.data;
  switch (type) {
    case 'popularSearches':
      for (const query of popularQueries) {
        await exports.searchVideos(query, 10);
      }
      break;
    case 'popularVideos':
      for (const videoId of popularVideoIds) {
        await exports.getVideoDetails(videoId);
        await exports.getRelatedVideos(videoId, 10);
        await exports.getVideoComments(videoId, 20);
      }
      break;
    case 'featuredVideos':
      await exports.getFeaturedVideos(50);
      break;
  }
});

// バッチ更新のスケジューリング
function scheduleBatchUpdates() {
  batchUpdateQueue.add({ type: 'popularSearches' }, { repeat: { cron: '0 */4 * * *' } }); // 4時間ごと
  batchUpdateQueue.add({ type: 'popularVideos' }, { repeat: { cron: '0 */6 * * *' } }); // 6時間ごと
  batchUpdateQueue.add({ type: 'featuredVideos' }, { repeat: { cron: '0 */2 * * *' } }); // 2時間ごと
}

scheduleBatchUpdates();

// データの事前取得と定期更新
async function prefetchPopularData() {
  console.log('Prefetching popular data...');
  for (const query of popularQueries) {
    await exports.searchVideos(query, 10);
  }
  for (const videoId of popularVideoIds) {
    await exports.getVideoDetails(videoId);
    await exports.getRelatedVideos(videoId, 10);
    await exports.getVideoComments(videoId, 20);
  }
  await exports.getFeaturedVideos(50);
  console.log('Prefetching completed');
}

// 定期的なデータ更新
setInterval(prefetchPopularData, 3600000);

// APIリクエスト数の監視と警告
let dailyApiRequests = 0;
const API_REQUEST_LIMIT_WARNING = 8000;

function trackApiRequest() {
  dailyApiRequests++;
  if (dailyApiRequests > API_REQUEST_LIMIT_WARNING) {
    console.warn(`Warning: Daily API request count (${dailyApiRequests}) is approaching the limit.`);
  }
}

// 日次APIリクエストカウントのリセット
function resetDailyApiRequestCount() {
  const now = new Date();
  const night = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    dailyApiRequests = 0;
    console.log('Daily API request count reset');
    resetDailyApiRequestCount();
  }, msToMidnight);
}

resetDailyApiRequestCount();

// エラー発生時のフォールバック処理の強化
function handleApiError(error, action) {
  console.error(`Error ${action}:`, error);
  if (error.response && error.response.data) {
    console.error("YouTube API error details:", error.response.data);
  }
  if (isQuotaExceededError(error) || (error.response && error.response.status === 429)) {
    console.warn(`YouTube API ${action} failed due to quota exceeded or rate limiting. Using dummy data.`);
    return { error: `YouTube API ${action} failed. Using dummy data.`, dummy: true };
  }
  return { error: `An error occurred while ${action}. Using dummy data.`, dummy: true };
}

// パフォーマンスモニタリングの強化
const performanceData = {};

function savePerformanceData(action, duration) {
  if (!performanceData[action]) {
    performanceData[action] = [];
  }
  performanceData[action].push(duration);
  if (performanceData[action].length > 100) {
    performanceData[action].shift();
  }
  
  const avg = performanceData[action].reduce((sum, val) => sum + val, 0) / performanceData[action].length;
  console.log(`Performance data: ${action} took ${duration}ms (Avg: ${avg.toFixed(2)}ms)`);
  
  if (duration > avg * 2) {
    console.warn(`Warning: ${action} performance degradation detected.`);
  }
}

// 定期的なパフォーマンスレポート生成
function generatePerformanceReport() {
  console.log('Performance Report:');
  for (const [action, data] of Object.entries(performanceData)) {
    const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
    const max = Math.max(...data);
    const min = Math.min(...data);
    console.log(`${action}: Avg=${avg.toFixed(2)}ms, Max=${max}ms, Min=${min}ms`);
  }
}

setInterval(generatePerformanceReport, 3600000);

// エラーログの保存
const errorLogs = [];

function logError(error, context) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    context: context
  };
  errorLogs.push(errorLog);
  if (errorLogs.length > 1000) {
    errorLogs.shift();
  }
  console.error('Error logged:', errorLog);
}

// 定期的なエラーレポート生成
function generateErrorReport() {
  console.log('Error Report:');
  const errorCounts = {};
  for (const log of errorLogs) {
    if (!errorCounts[log.error]) {
      errorCounts[log.error] = 0;
    }
    errorCounts[log.error]++;
  }
  for (const [error, count] of Object.entries(errorCounts)) {
    console.log(`${error}: ${count} occurrences`);
  }
}

setInterval(generateErrorReport, 86400000);

// 負荷分散サポート
exports.setLoadBalancer = (loadBalancer) => {
  console.log('Load balancer set up');
};

// デバッグモード
let debugMode = false;

exports.setDebugMode = (mode) => {
  debugMode = mode;
  console.log(`Debug mode set to: ${mode}`);
};

function debugLog(...args) {
  if (debugMode) {
    console.log('[DEBUG]', ...args);
  }
}

// ヘルスチェック関数
exports.healthCheck = async () => {
  try {
    const apiStatus = await exports.checkApiStatus();
    const cacheStats = await exports.getCacheStats();
    const apiUsage = exports.getApiKeyUsageReport();
    
    return {
      status: 'OK',
      apiStatus,
      cacheStats,
      apiUsage,
      uptime: process.uptime()
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'ERROR',
      error: error.message
    };
  }
};

// メインのエクスポート
module.exports = {
  searchVideos: exports.searchVideos,
  getVideoDetails: exports.getVideoDetails,
  getRelatedVideos: exports.getRelatedVideos,
  getFeaturedVideos: exports.getFeaturedVideos,
  getVideoComments: exports.getVideoComments,
  checkApiStatus: exports.checkApiStatus,
  getCacheStats: exports.getCacheStats,
  clearCache: exports.clearCache,
  getApiKeyUsageReport: exports.getApiKeyUsageReport,
  searchVideosWithRetry: exports.searchVideosWithRetry,
  getVideoDetailsWithRetry: exports.getVideoDetailsWithRetry,
  getRelatedVideosWithRetry: exports.getRelatedVideosWithRetry,
  getFeaturedVideosWithRetry: exports.getFeaturedVideosWithRetry,
  getVideoCommentsWithRetry: exports.getVideoCommentsWithRetry,
  resetApiKeyQuotaUsage: exports.resetApiKeyQuotaUsage,
  getCacheHitRate: exports.getCacheHitRate,
  getClientSideCacheControl: exports.getClientSideCacheControl,
  setLoadBalancer: exports.setLoadBalancer,
  setDebugMode: exports.setDebugMode,
  healthCheck: exports.healthCheck,
  handleError,
  savePerformanceData,
  updateCacheStats,
  monitorApiUsage,
  getDetailedApiKeyUsageReport,
  rotateApiKeyOptimized,
  retryWithDynamicBackoff,
  prefetchPopularData
};

function generateApiKeyUsageReport() {
  for (const [key, usage] of apiKeyUsage.entries()) {
    console.log(`API Key ${key.slice(0, 5)}...: Quota used: ${usage.quota}, Requests: ${usage.count}`);
  }
}

setInterval(generateApiKeyUsageReport, 3600000);

function distributeLoad() {
  const totalKeys = API_KEYS.length;
  return Math.floor(Math.random() * totalKeys);
}
