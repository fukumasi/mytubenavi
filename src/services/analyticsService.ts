// src/services/analyticsService.ts
import { supabase } from '@/lib/supabase';

export interface VideoPerformanceData {
  youtubeId: string;
  title: string;
  viewCount: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  costPerView: number;
  costPerClick: number;
  thumbnailUrl?: string;
}

export interface CompetitorPerformance {
  youtubeId: string;
  title: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  category: string;
  publishedAt: string;
  thumbnailUrl?: string;
}

export interface ChannelGrowthData {
  date: string;
  subscribers: number;
  views: number;
  promotionCost?: number;
}

export interface GenrePerformanceData {
  genreId: string;
  genreName: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averageCost: number;
  bookingsCount: number;
  totalSpent: number;
  viewCount: number;
  costPerView: number;
}

// 掲載前後の効果比較のためのインターフェース
export interface PromotionEffectData {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  promotionStartDate: string;
  promotionEndDate: string;
  beforePromotion: {
    viewCount: number;
    subscriberGain: number;
    dailyAverageViews: number;
  };
  duringPromotion: {
    viewCount: number;
    subscriberGain: number;
    dailyAverageViews: number;
    impressions: number;
    clicks: number;
    ctr: number;
  };
  afterPromotion: {
    viewCount: number;
    subscriberGain: number;
    dailyAverageViews: number;
  };
  impact: {
    viewCountIncrease: number;
    viewCountIncreasePercent: number;
    subscriberGainIncrease: number;
    dailyAverageViewsIncrease: number;
    dailyAverageViewsIncreasePercent: number;
  };
  cost: number;
  roi: number;
}

export const analyticsService = {
  // YouTubeの動画パフォーマンスデータを取得（掲載枠予約と実際の再生数を統合）
  async getVideoPerformance(userId: string, timeRange: string = '1month'): Promise<VideoPerformanceData[]> {
    try {
      // 期間の計算
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '1week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (timeRange === '1month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else if (timeRange === '3months') {
        startDate.setMonth(endDate.getMonth() - 3);
      } else if (timeRange === '1year') {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }
      
      // ユーザーの予約情報を取得
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('slot_bookings')
        .select(`
          id,
          youtube_id,
          amount_paid,
          start_date,
          end_date,
          status,
          video_id
        `)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (bookingsError) throw bookingsError;
      if (!bookingsData || bookingsData.length === 0) {
        return [];
      }
      
      // 予約IDを収集
      const bookingIds = bookingsData.map(booking => booking.id);
      const youtubeIds = bookingsData.map(booking => booking.youtube_id).filter(id => !!id);
      // 未使用変数を削除: videoIds
      
      // アナリティクスデータを取得
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('slot_booking_analytics')
        .select('*')
        .in('booking_id', bookingIds);
        
      if (analyticsError) throw analyticsError;
      
      // YouTubeの動画情報を取得
      let videoInfoData: any[] = [];
      if (youtubeIds.length > 0) {
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('youtube_id, title, view_count, thumbnail')
          .in('youtube_id', youtubeIds);
          
        if (!videoError && videoData) {
          videoInfoData = videoData;
        }
      }
      
      // アナリティクスデータをブッキングIDでグループ化
      const analyticsMap = new Map<string, { impressions: number; clicks: number }>();
      
      if (analyticsData) {
        analyticsData.forEach(item => {
          const existing = analyticsMap.get(item.booking_id) || { impressions: 0, clicks: 0 };
          analyticsMap.set(item.booking_id, {
            impressions: existing.impressions + (item.impressions || 0),
            clicks: existing.clicks + (item.clicks || 0)
          });
        });
      }
      
      // YouTubeIDとビデオIDのマッピングを作成
      const youtubeInfoMap = new Map<string, any>();
      videoInfoData.forEach(info => {
        youtubeInfoMap.set(info.youtube_id, info);
      });
      
      // 結果を組み立て
      return bookingsData.map(booking => {
        const youtubeId = booking.youtube_id || '';
        const videoInfo = youtubeInfoMap.get(youtubeId) || {};
        const analytics = analyticsMap.get(booking.id) || { impressions: 0, clicks: 0 };
        const cost = booking.amount_paid || 0;
        const impressions = analytics.impressions || 0;
        const clicks = analytics.clicks || 0;
        const viewCount = videoInfo.view_count || 0;
        
        return {
          youtubeId,
          title: videoInfo.title || `動画ID: ${youtubeId}`,
          viewCount,
          impressions,
          clicks,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cost,
          costPerView: viewCount > 0 ? cost / viewCount : 0,
          costPerClick: clicks > 0 ? cost / clicks : 0,
          thumbnailUrl: videoInfo.thumbnail || `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
        };
      }).filter(item => item.youtubeId); // YouTubeIDがあるものだけを返す
    } catch (error) {
      console.error('動画パフォーマンスデータの取得に失敗しました:', error);
      return [];
    }
  },

  // チャンネル成長データの取得
  async getChannelGrowth(userId: string, timeRange: string = '1year'): Promise<ChannelGrowthData[]> {
    try {
      // 期間の計算
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '1month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else if (timeRange === '3months') {
        startDate.setMonth(endDate.getMonth() - 3);
      } else if (timeRange === '6months') {
        startDate.setMonth(endDate.getMonth() - 6);
      } else {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }
      
      // チャンネル統計データを取得
      const { data: statsData, error: statsError } = await supabase
        .from('channel_stats')
        .select('*')
        .eq('youtuber_id', userId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });
        
      if (statsError) throw statsError;
      
      if (!statsData || statsData.length === 0) {
        // データがない場合はサンプルデータを返す
        return generateSampleChannelData(startDate, endDate);
      }
      
      // 掲載費用データを取得
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('slot_bookings')
        .select('amount_paid, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      if (bookingsError) throw bookingsError;
      
      // 日付ごとの掲載費をマッピング
      const costByDate: Record<string, number> = {};
      if (bookingsData) {
        bookingsData.forEach(booking => {
          if (!booking.created_at || !booking.amount_paid) return;
          const date = new Date(booking.created_at).toISOString().split('T')[0];
          costByDate[date] = (costByDate[date] || 0) + booking.amount_paid;
        });
      }
      
      // チャンネル成長データを構築
      return statsData.map(stat => {
        const date = new Date(stat.recorded_at).toISOString().split('T')[0];
        return {
          date,
          subscribers: stat.subscriber_count || 0,
          views: stat.total_views || 0,
          promotionCost: costByDate[date] || 0
        };
      });
    } catch (error) {
      console.error('チャンネル成長データの取得に失敗しました:', error);
      // エラー時に引数のuserIdとtimeRangeを実際に使用する
      console.error(`ユーザーID: ${userId}, 期間: ${timeRange}でのエラー発生`);
      
      // startDateとendDateを現在のスコープで宣言する
      const endDate = new Date();
      const startDate = new Date();
      
      // timeRangeに基づいて開始日を設定（引数から取得）
      if (timeRange === '1month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else if (timeRange === '3months') {
        startDate.setMonth(endDate.getMonth() - 3);
      } else if (timeRange === '6months') {
        startDate.setMonth(endDate.getMonth() - 6);
      } else {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }
      
      return generateSampleChannelData(startDate, endDate);
    }
  },

  // ジャンル別の掲載効果
  async getGenrePerformance(userId: string, timeRange: string = '3months'): Promise<GenrePerformanceData[]> {
    try {
      // 期間の計算
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '1week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (timeRange === '1month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else if (timeRange === '3months') {
        startDate.setMonth(endDate.getMonth() - 3);
      } else if (timeRange === '1year') {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }
      
      // ユーザーの予約情報を取得（promotion_slots情報を含む）
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('slot_bookings')
        .select(`
          id,
          youtube_id,
          amount_paid,
          promotion_slot_id,
          promotion_slots(id, genre_id, type),
          video_id
        `)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (bookingsError) throw bookingsError;
      if (!bookingsData || bookingsData.length === 0) {
        return [];
      }
      
      // 予約IDとスロットIDを収集
      const bookingIds = bookingsData.map(booking => booking.id);
      const youtubeIds = bookingsData
        .map(booking => booking.youtube_id)
        .filter(id => !!id);
      
      // すべてのジャンル情報を取得
      const { data: allGenres, error: genresError } = await supabase
        .from('genres')
        .select('id, name, parent_id');
        
      if (genresError) throw genresError;
      
      // ジャンルIDから名前へのマッピングを作成
      const genreMap = new Map<string, string>();
      if (allGenres) {
        allGenres.forEach(genre => {
          genreMap.set(genre.id, genre.name);
        });
      }
      
      // アナリティクスデータを取得
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('slot_booking_analytics')
        .select('*')
        .in('booking_id', bookingIds);
        
      if (analyticsError) throw analyticsError;
      
      // YouTubeの動画情報を取得
      let videoInfoData: any[] = [];
      if (youtubeIds.length > 0) {
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('youtube_id, view_count')
          .in('youtube_id', youtubeIds);
          
        if (!videoError && videoData) {
          videoInfoData = videoData;
        }
      }
      
      // YouTubeIDと視聴回数のマッピングを作成
      const viewCountMap = new Map<string, number>();
      videoInfoData.forEach(info => {
        viewCountMap.set(info.youtube_id, info.view_count || 0);
      });
      
      // ブッキングをジャンルIDでグループ化
      interface GenreStat {
        impressions: number;
        clicks: number;
        cost: number;
        bookingsCount: number;
        viewCount: number;
        genreName: string;
      }
      
      const genreStats = new Map<string, GenreStat>();
      
      // 各ブッキングをジャンルごとに集計
      bookingsData.forEach(booking => {
        const promotionSlot = booking.promotion_slots as any;
        if (!promotionSlot) return;
        
        const genreId = promotionSlot.genre_id;
        if (!genreId) return;
        
        const genreName = genreMap.get(genreId) || `ジャンルID: ${genreId}`;
        const youtubeId = booking.youtube_id || '';
        const viewCount = viewCountMap.get(youtubeId) || 0;
        const cost = booking.amount_paid || 0;
        
        // アナリティクスデータを取得
        const bookingAnalytics = analyticsData?.filter(a => a.booking_id === booking.id) || [];
        const impressions = bookingAnalytics.reduce((sum, a) => sum + (a.impressions || 0), 0);
        const clicks = bookingAnalytics.reduce((sum, a) => sum + (a.clicks || 0), 0);
        
        // ジャンル統計に追加
        const existing = genreStats.get(genreId) || {
          impressions: 0,
          clicks: 0,
          cost: 0,
          bookingsCount: 0,
          viewCount: 0,
          genreName
        };
        
        genreStats.set(genreId, {
          impressions: existing.impressions + impressions,
          clicks: existing.clicks + clicks,
          cost: existing.cost + cost,
          bookingsCount: existing.bookingsCount + 1,
          viewCount: existing.viewCount + viewCount,
          genreName
        });
      });
      
      // 結果を構築
      const result: GenrePerformanceData[] = [];
      
      genreStats.forEach((stats, genreId) => {
        const ctr = stats.impressions > 0 
          ? (stats.clicks / stats.impressions) * 100 
          : 0;
        
        const averageCost = stats.bookingsCount > 0 
          ? stats.cost / stats.bookingsCount 
          : 0;
        
        const costPerView = stats.viewCount > 0 
          ? stats.cost / stats.viewCount 
          : 0;
        
        result.push({
          genreId,
          genreName: stats.genreName,
          impressions: stats.impressions,
          clicks: stats.clicks,
          ctr,
          averageCost,
          bookingsCount: stats.bookingsCount,
          totalSpent: stats.cost,
          viewCount: stats.viewCount,
          costPerView
        });
      });
      
      // 結果をCTR降順でソート
      return result.sort((a, b) => b.ctr - a.ctr);
    } catch (error) {
      console.error('ジャンル別パフォーマンスデータの取得に失敗しました:', error);
      return [];
    }
  },

  // ROI（投資収益率）の計算
  async calculateROI(userId: string, timeRange: string = '3months'): Promise<{
    totalSpent: number;
    estimatedRevenue: number;
    roi: number;
  }> {
    try {
      // 期間の計算
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '1month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else if (timeRange === '3months') {
        startDate.setMonth(endDate.getMonth() - 3);
      } else if (timeRange === '6months') {
        startDate.setMonth(endDate.getMonth() - 6);
      } else {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }
      
      // 掲載費用の合計を取得
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('slot_bookings')
        .select('amount_paid')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      if (bookingsError) throw bookingsError;
      
      const totalSpent = bookingsData
        ? bookingsData.reduce((sum, booking) => sum + (booking.amount_paid || 0), 0)
        : 0;
      
      // 再生数の増加を取得
      const { data: statsData, error: statsError } = await supabase
        .from('channel_stats')
        .select('total_views, subscriber_count')
        .eq('youtuber_id', userId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });
        
      if (statsError) throw statsError;
      
      if (!statsData || statsData.length < 2) {
        // 十分なデータがない場合は保守的な見積もり
        const singleStatData = statsData && statsData.length === 1 ? statsData[0] : null;
        const estimatedViews = singleStatData ? singleStatData.total_views * 0.1 : totalSpent * 2; // 仮定
        const estimatedRevenue = estimatedViews * 0.2; // 視聴回数あたり0.2円と仮定
        
        const roi = totalSpent > 0 
          ? ((estimatedRevenue - totalSpent) / totalSpent) * 100
          : 0;
        
        return {
          totalSpent,
          estimatedRevenue,
          roi
        };
      }
      
      // 期間内の視聴回数の増加を計算
      const firstRecord = statsData[0];
      const lastRecord = statsData[statsData.length - 1];
      
      const viewsIncrease = lastRecord.total_views - firstRecord.total_views;
      const subscribersIncrease = lastRecord.subscriber_count - firstRecord.subscriber_count;
      
      // 収益の見積もり（より現実的な計算）
      // 視聴回数の増加だけでなく、チャンネル登録者の増加も考慮
      // 典型的なYouTube収益は1000再生あたり¥100-200程度
      const viewsRevenue = viewsIncrease * 0.15; // 1視聴あたり0.15円と仮定
      const subscriberValue = subscribersIncrease * 100; // 1登録者あたり100円の価値と仮定
      
      const estimatedRevenue = viewsRevenue + subscriberValue;
      
      // ROIの計算
      const roi = totalSpent > 0 
        ? ((estimatedRevenue - totalSpent) / totalSpent) * 100
        : 0;
      
      return {
        totalSpent,
        estimatedRevenue,
        roi
      };
    } catch (error) {
      console.error('ROI計算に失敗しました:', error);
      return {
        totalSpent: 0,
        estimatedRevenue: 0,
        roi: 0
      };
    }
  },
  
  // 掲載前後の効果分析
  async getPromotionEffectAnalysis(userId: string, timeRange: string = '3months'): Promise<PromotionEffectData[]> {
    try {
      // 期間の計算
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '1week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (timeRange === '1month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else if (timeRange === '3months') {
        startDate.setMonth(endDate.getMonth() - 3);
      } else if (timeRange === '1year') {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }
      
      // ユーザーの予約情報を取得
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('slot_bookings')
        .select(`
          id,
          video_id,
          youtube_id,
          amount_paid,
          start_date,
          end_date,
          status
        `)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed')  // 完了した掲載のみを対象
        .order('start_date', { ascending: false });
        
      if (bookingsError) throw bookingsError;
      if (!bookingsData || bookingsData.length === 0) {
        return [];
      }
      
      // 結果格納用の配列
      const results: PromotionEffectData[] = [];
      
      // 各予約に対して掲載前後の効果を分析
      for (const booking of bookingsData) {
        const youtubeId = booking.youtube_id;
        if (!youtubeId) continue;
        
        // 掲載期間の定義
        const promotionStartDate = new Date(booking.start_date);
        const promotionEndDate = new Date(booking.end_date);
        
        // 掲載前の期間（掲載期間と同じ日数分）
        const daysInPromotion = Math.ceil((promotionEndDate.getTime() - promotionStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const beforeStartDate = new Date(promotionStartDate);
        beforeStartDate.setDate(beforeStartDate.getDate() - daysInPromotion);
        
        // 掲載後の期間（掲載期間と同じ日数分）
        const afterEndDate = new Date(promotionEndDate);
        afterEndDate.setDate(afterEndDate.getDate() + daysInPromotion);
        
        // 動画情報の取得
        const { data: videoInfo, error: videoError } = await supabase
          .from('videos')
          .select('title, view_count, thumbnail')
          .eq('youtube_id', youtubeId)
          .single();
          
        if (videoError) {
          console.error('動画情報の取得に失敗:', videoError);
          continue;
        }
        
        // アナリティクスデータの取得
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('slot_booking_analytics')
          .select('*')
          .eq('booking_id', booking.id);
          
        if (analyticsError) {
          console.error('アナリティクスデータの取得に失敗:', analyticsError);
          continue;
        }
        
        // チャンネル統計データの取得（掲載前・中・後）
        const { data: channelStatsBefore, error: statsBeforeError } = await supabase
          .from('channel_stats')
          .select('*')
          .eq('youtuber_id', userId)
          .gte('recorded_at', beforeStartDate.toISOString())
          .lt('recorded_at', promotionStartDate.toISOString())
          .order('recorded_at', { ascending: true });
          
        if (statsBeforeError) {
          console.error('掲載前チャンネル統計の取得に失敗:', statsBeforeError);
          continue;
        }
        
        const { data: channelStatsDuring, error: statsDuringError } = await supabase
          .from('channel_stats')
          .select('*')
          .eq('youtuber_id', userId)
          .gte('recorded_at', promotionStartDate.toISOString())
          .lte('recorded_at', promotionEndDate.toISOString())
          .order('recorded_at', { ascending: true });
          
        if (statsDuringError) {
          console.error('掲載中チャンネル統計の取得に失敗:', statsDuringError);
          continue;
        }
        
        const { data: channelStatsAfter, error: statsAfterError } = await supabase
          .from('channel_stats')
          .select('*')
          .eq('youtuber_id', userId)
          .gt('recorded_at', promotionEndDate.toISOString())
          .lte('recorded_at', afterEndDate.toISOString())
          .order('recorded_at', { ascending: true });
          
        if (statsAfterError) {
          console.error('掲載後チャンネル統計の取得に失敗:', statsAfterError);
          continue;
        }
        
        // 各期間のデータ分析
        // 掲載前
        const beforeViewCount = channelStatsBefore && channelStatsBefore.length >= 2
          ? channelStatsBefore[channelStatsBefore.length - 1].total_views - channelStatsBefore[0].total_views
          : 0;
          
        const beforeSubscriberGain = channelStatsBefore && channelStatsBefore.length >= 2
          ? channelStatsBefore[channelStatsBefore.length - 1].subscriber_count - channelStatsBefore[0].subscriber_count
          : 0;
          
        const beforeDailyAverageViews = channelStatsBefore && channelStatsBefore.length >= 2 && daysInPromotion > 0
          ? beforeViewCount / daysInPromotion
          : 0;
        
        // 掲載中
        const duringViewCount = channelStatsDuring && channelStatsDuring.length >= 2
          ? channelStatsDuring[channelStatsDuring.length - 1].total_views - channelStatsDuring[0].total_views
          : 0;
          
        const duringSubscriberGain = channelStatsDuring && channelStatsDuring.length >= 2
          ? channelStatsDuring[channelStatsDuring.length - 1].subscriber_count - channelStatsDuring[0].subscriber_count
          : 0;
          
        const duringDailyAverageViews = channelStatsDuring && channelStatsDuring.length >= 2 && daysInPromotion > 0
          ? duringViewCount / daysInPromotion
          : 0;
          
        // アナリティクスからインプレッションとクリック数を集計
        const impressions = analyticsData
          ? analyticsData.reduce((sum, item) => sum + (item.impressions || 0), 0)
          : 0;
          
        const clicks = analyticsData
          ? analyticsData.reduce((sum, item) => sum + (item.clicks || 0), 0)
          : 0;
          
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        
        // 掲載後
        const afterViewCount = channelStatsAfter && channelStatsAfter.length >= 2
          ? channelStatsAfter[channelStatsAfter.length - 1].total_views - channelStatsAfter[0].total_views
          : 0;
          
        const afterSubscriberGain = channelStatsAfter && channelStatsAfter.length >= 2
          ? channelStatsAfter[channelStatsAfter.length - 1].subscriber_count - channelStatsAfter[0].subscriber_count
          : 0;
          
        const afterDailyAverageViews = channelStatsAfter && channelStatsAfter.length >= 2 && daysInPromotion > 0
          ? afterViewCount / daysInPromotion
          : 0;
          // 効果の測定
        const viewCountIncrease = duringViewCount - beforeViewCount;
        const viewCountIncreasePercent = beforeViewCount > 0
          ? (viewCountIncrease / beforeViewCount) * 100
          : 0;
          
        const subscriberGainIncrease = duringSubscriberGain - beforeSubscriberGain;
        
        const dailyAverageViewsIncrease = duringDailyAverageViews - beforeDailyAverageViews;
        const dailyAverageViewsIncreasePercent = beforeDailyAverageViews > 0
          ? (dailyAverageViewsIncrease / beforeDailyAverageViews) * 100
          : 0;
        
        // ROIの計算
        // 視聴回数の増加とチャンネル登録者増加をベースに推定収益を算出
        const viewsRevenue = viewCountIncrease * 0.15; // 1視聴あたり0.15円
        const subscriberValue = subscriberGainIncrease * 100; // 1登録者あたり100円
        const estimatedRevenue = viewsRevenue + subscriberValue;
        
        const cost = booking.amount_paid || 0;
        const roi = cost > 0
          ? ((estimatedRevenue - cost) / cost) * 100
          : 0;
        
        // 結果を追加
        results.push({
          youtubeId,
          title: videoInfo?.title || `動画ID: ${youtubeId}`,
          thumbnailUrl: videoInfo?.thumbnail || `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
          promotionStartDate: promotionStartDate.toISOString(),
          promotionEndDate: promotionEndDate.toISOString(),
          beforePromotion: {
            viewCount: beforeViewCount,
            subscriberGain: beforeSubscriberGain,
            dailyAverageViews: beforeDailyAverageViews
          },
          duringPromotion: {
            viewCount: duringViewCount,
            subscriberGain: duringSubscriberGain,
            dailyAverageViews: duringDailyAverageViews,
            impressions,
            clicks,
            ctr
          },
          afterPromotion: {
            viewCount: afterViewCount,
            subscriberGain: afterSubscriberGain,
            dailyAverageViews: afterDailyAverageViews
          },
          impact: {
            viewCountIncrease,
            viewCountIncreasePercent,
            subscriberGainIncrease,
            dailyAverageViewsIncrease,
            dailyAverageViewsIncreasePercent
          },
          cost,
          roi
        });
      }
      
      return results;
    } catch (error) {
      console.error('掲載効果分析に失敗しました:', error);
      return [];
    }
  }
};

// サンプルチャンネルデータの生成
function generateSampleChannelData(startDate: Date, endDate: Date): ChannelGrowthData[] {
  const result: ChannelGrowthData[] = [];
  const currentDate = new Date(startDate);
  let subscribers = 500 + Math.floor(Math.random() * 500);
  let views = 5000 + Math.floor(Math.random() * 5000);
  
  while (currentDate <= endDate) {
    // データポイントを追加
    result.push({
      date: currentDate.toISOString().split('T')[0],
      subscribers,
      views,
      promotionCost: Math.random() > 0.8 ? Math.floor(Math.random() * 10000) : 0
    });
    
    // 次の日に進む
    currentDate.setDate(currentDate.getDate() + 7); // 週ごとのデータ
    
    // 購読者と視聴回数を増加（ランダム）
    subscribers += Math.floor(Math.random() * 50);
    views += Math.floor(Math.random() * 1000);
  }
  
  return result;
}