// src/components/admin/AnalyticsDashboard.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import LoadingSpinner from '../ui/LoadingSpinner';

// 統計情報の型定義
type StatisticsData = {
  date: string;
  newUsers: number;
  activeUsers: number;
  premiumConversions: number;
  videoViews: number;
  uniqueViewers: number;
  ratings: number;
  comments: number;
};

// コンテンツ分析の型定義
type ContentAnalytics = {
  genreId: string;
  genreName: string;
  viewCount: number;
  commentCount: number;
  ratingAvg: number;
  color?: string;
};

// ユーザー行動の型定義
type UserBehavior = {
  action: string;
  count: number;
  percentage: number;
  color?: string;
};

// 人気動画の型定義
type PopularVideo = {
  videoId: string;
  youtubeId: string;
  title: string;
  viewCount: number;
  ratingAvg: number;
  commentCount: number;
};

type DateRange = '7days' | '30days' | '90days';

// グラフ種類の型定義
type ChartType = 'line' | 'bar' | 'pie';

// チャートデータセットの型定義
type DatasetKey = 'userStats' | 'contentStats' | 'behaviorStats';

// Supabaseクエリ結果の型 (未使用の型定義はコメントアウト)
// type ViewCountResult = {
//   video_id: string;
//   count: string;
// };

// type RatingResult = {
//   video_id: string;
//   avg: number;
// };

// type CommentCountResult = {
//   video_id: string;
//   count: string;
// };

const AnalyticsDashboard: React.FC = () => {
  // 状態管理
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [chartTypes, setChartTypes] = useState<Record<DatasetKey, ChartType>>({
    userStats: 'line',
    contentStats: 'bar',
    behaviorStats: 'pie',
  });

  // データの状態
  const [statisticsData, setStatisticsData] = useState<StatisticsData[]>([]);
  const [contentAnalytics, setContentAnalytics] = useState<ContentAnalytics[]>([]);
  const [userBehavior, setUserBehavior] = useState<UserBehavior[]>([]);
  const [popularVideos, setPopularVideos] = useState<PopularVideo[]>([]);

  // 色のパレット
  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE',
    '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
  ];

  // 日付範囲に基づく日数を計算
  const getDayCount = (range: DateRange): number => {
    switch (range) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      default: return 30;
    }
  };

  // 統計データの取得
  const fetchStatisticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dayCount = getDayCount(dateRange);
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(endDate, dayCount));

      // ユーザー関連の統計データ
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, created_at, is_premium, role')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (usersError) throw new Error(`ユーザーデータの取得に失敗しました: ${usersError.message}`);

      // 動画視聴の統計データ
      const { data: viewsData, error: viewsError } = await supabase
        .from('view_history')
        .select('id, user_id, video_id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (viewsError) throw new Error(`視聴履歴データの取得に失敗しました: ${viewsError.message}`);

      // 評価データ
      const { data: ratingsData, error: ratingsError } = await supabase
  .from('video_ratings')
  .select('id, user_id, video_id, overall, created_at')
  .gte('created_at', startDate.toISOString())
  .lte('created_at', endDate.toISOString());

      if (ratingsError) throw new Error(`評価データの取得に失敗しました: ${ratingsError.message}`);

      // コメントデータ
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, user_id, video_id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (commentsError) throw new Error(`コメントデータの取得に失敗しました: ${commentsError.message}`);

      // プレミアム会員データ
      const { data: premiumData, error: premiumError } = await supabase
        .from('premium_payments')
        .select('id, user_id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (premiumError) throw new Error(`プレミアム会員データの取得に失敗しました: ${premiumError.message}`);

      // 日別データの生成
      const dailyData: StatisticsData[] = [];

      for (let i = 0; i < dayCount; i++) {
        const currentDate = subDays(endDate, dayCount - 1 - i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayStart = startOfDay(currentDate);
        const dayEnd = endOfDay(currentDate);

        // その日に登録した新規ユーザー数
        const newUsers = usersData.filter(user => {
          const createdAt = new Date(user.created_at);
          return createdAt >= dayStart && createdAt <= dayEnd;
        }).length;

        // その日にアクティブだったユーザー数（視聴、評価、コメントのいずれかを行ったユーザー）
        const activeUserIds = new Set<string>();

        viewsData.forEach(view => {
          const viewDate = new Date(view.created_at);
          if (viewDate >= dayStart && viewDate <= dayEnd && view.user_id) {
            activeUserIds.add(view.user_id);
          }
        });

        ratingsData.forEach(rating => {
          const ratingDate = new Date(rating.created_at);
          if (ratingDate >= dayStart && ratingDate <= dayEnd && rating.user_id) {
            activeUserIds.add(rating.user_id);
          }
        });

        commentsData.forEach(comment => {
          const commentDate = new Date(comment.created_at);
          if (commentDate >= dayStart && commentDate <= dayEnd && comment.user_id) {
            activeUserIds.add(comment.user_id);
          }
        });

        // その日のプレミアム会員登録数
        const premiumConversions = premiumData.filter(premium => {
          const createdAt = new Date(premium.created_at);
          return createdAt >= dayStart && createdAt <= dayEnd;
        }).length;

        // その日の動画視聴数
        const videoViews = viewsData.filter(view => {
          const viewDate = new Date(view.created_at);
          return viewDate >= dayStart && viewDate <= dayEnd;
        }).length;

        // その日のユニーク視聴者数
        const uniqueViewerIds = new Set<string>();
        viewsData.forEach(view => {
          const viewDate = new Date(view.created_at);
          if (viewDate >= dayStart && viewDate <= dayEnd && view.user_id) {
            uniqueViewerIds.add(view.user_id);
          }
        });

        // その日の評価数
        const ratings = ratingsData.filter(rating => {
          const ratingDate = new Date(rating.created_at);
          return ratingDate >= dayStart && ratingDate <= dayEnd;
        }).length;

        // その日のコメント数
        const comments = commentsData.filter(comment => {
          const commentDate = new Date(comment.created_at);
          return commentDate >= dayStart && commentDate <= dayEnd;
        }).length;

        dailyData.push({
          date: dateStr,
          newUsers,
          activeUsers: activeUserIds.size,
          premiumConversions,
          videoViews,
          uniqueViewers: uniqueViewerIds.size,
          ratings,
          comments,
        });
      }

      setStatisticsData(dailyData);

      // コンテンツ分析データの取得
      fetchContentAnalytics();

      // ユーザー行動分析データの取得
      fetchUserBehaviorData(viewsData, ratingsData, commentsData);

      // 人気動画データの取得
      fetchPopularVideos(startDate, endDate);

    } catch (err: any) {
      console.error('統計データの取得中にエラーが発生しました:', err);
      setError(err.message || '統計データの取得中に問題が発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

// コンテンツ分析データの取得
const fetchContentAnalytics = async () => {
  try {
    // ジャンル情報の取得 - 構文を修正
    const { data: genresData, error: genresError } = await supabase
      .from('genres')
      .select('id, name')
      .not('parent_genre_id', 'is', null); // 正しい構文

    if (genresError) throw new Error(`ジャンル情報の取得に失敗しました: ${genresError.message}`);
    
    if (!genresData || genresData.length === 0) {
      setContentAnalytics([]);
      return;
    }

    // 各ジャンルのデータを集計
    const genreAnalytics: ContentAnalytics[] = [];
    
    for (const genre of genresData) {
      // ジャンルに関連する動画を取得
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('id')
        .eq('genre_id', genre.id);
      
      if (videosError) {
        console.error(`ジャンル「${genre.name}」の動画情報取得に失敗: ${videosError.message}`);
        continue; // このジャンルはスキップして次へ
      }
      
      if (!videosData || videosData.length === 0) {
        // 動画がない場合は0でデータを追加
        genreAnalytics.push({
          genreId: genre.id,
          genreName: genre.name,
          viewCount: 0,
          commentCount: 0,
          ratingAvg: 0,
          color: COLORS[genreAnalytics.length % COLORS.length]
        });
        continue;
      }
      
      const videoIds = videosData.map(v => v.id);
      
      // 視聴数の取得
      let viewCount = 0;
      const { count: viewsCount, error: viewsError } = await supabase
        .from('view_history')
        .select('id', { count: 'exact', head: true })
        .in('video_id', videoIds);
      
      if (!viewsError && viewsCount !== null) {
        viewCount = viewsCount;
      }
      
      // コメント数の取得
      let commentCount = 0;
      const { count: commentsCount, error: commentsError } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .in('video_id', videoIds.map(id => id.toString())); // video_idがテキスト型の場合
      
      if (!commentsError && commentsCount !== null) {
        commentCount = commentsCount;
      }
      
      // 評価平均の取得
      let ratingAvg = 0;
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('video_ratings')
        .select('overall')
        .in('video_id', videoIds.map(id => id.toString())); // video_idがテキスト型の場合
      
      if (!ratingsError && ratingsData && ratingsData.length > 0) {
        const sum = ratingsData.reduce((acc, curr) => acc + (curr.overall || 0), 0);
        ratingAvg = sum / ratingsData.length;
      }
      
      genreAnalytics.push({
        genreId: genre.id,
        genreName: genre.name,
        viewCount,
        commentCount,
        ratingAvg: parseFloat(ratingAvg.toFixed(1)),
        color: COLORS[genreAnalytics.length % COLORS.length]
      });
    }
    
    // 視聴数でソート
    genreAnalytics.sort((a, b) => b.viewCount - a.viewCount);
    
    // 上位10ジャンルのみを設定
    setContentAnalytics(genreAnalytics.slice(0, 10));
    
  } catch (err: any) {
    console.error('コンテンツ分析データの取得中にエラーが発生しました:', err);
    // エラーを表示するが、メイン統計は続行
  }
};

  // 人気動画の取得
  const fetchPopularVideos = async (startDate: Date, endDate: Date) => {
    try {
      // Supabaseのgroup byが使えないため、クライアント側で集計する方法に変更
      // まず、視聴データを取得する
      const { data: viewHistoryData, error: viewsError } = await supabase
        .from('view_history')
        .select('video_id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (viewsError) throw new Error(`視聴履歴データの取得に失敗しました: ${viewsError.message}`);

      if (!viewHistoryData || viewHistoryData.length === 0) {
        setPopularVideos([]);
        return;
      }

      // ビデオごとの視聴回数を集計
      const viewCounts: Record<string, number> = {};
      viewHistoryData.forEach(view => {
        if (view.video_id) {
          viewCounts[view.video_id] = (viewCounts[view.video_id] || 0) + 1;
        }
      });

      // 視聴回数でソートしたビデオIDの配列を作成
      const sortedVideoIds = Object.keys(viewCounts).sort((a, b) => {
        return viewCounts[b] - viewCounts[a];
      }).slice(0, 5); // 上位5件のみ取得

      if (sortedVideoIds.length === 0) {
        setPopularVideos([]);
        return;
      }

      // ビデオの詳細情報を取得
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('id, youtube_id, title')
        .in('id', sortedVideoIds);

      if (videosError) throw new Error(`動画データの取得に失敗しました: ${videosError.message}`);

      if (!videosData || videosData.length === 0) {
        setPopularVideos([]);
        return;
      }

      // 評価データを取得して集計
      const { data: ratingsData, error: ratingsError } = await supabase
  .from('video_ratings')
  .select('video_id, overall');

      if (ratingsError) throw new Error(`評価データの取得に失敗しました: ${ratingsError.message}`);

      // ビデオごとの平均評価を計算
      const ratingAverages: Record<string, number> = {};
      const ratingsCount: Record<string, number> = {};

      if (ratingsData) {
        ratingsData.forEach(rating => {
          if (rating.video_id) {
            if (!ratingsCount[rating.video_id]) {
              ratingsCount[rating.video_id] = 0;
              ratingAverages[rating.video_id] = 0;
            }
            ratingsCount[rating.video_id]++;
            ratingAverages[rating.video_id] += rating.overall;
          }
        });

        // 平均を計算
        Object.keys(ratingAverages).forEach(videoId => {
          if (ratingsCount[videoId] > 0) {
            ratingAverages[videoId] = ratingAverages[videoId] / ratingsCount[videoId];
          }
        });
      }

      // コメントデータを取得して集計
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('video_id');

      if (commentsError) throw new Error(`コメントデータの取得に失敗しました: ${commentsError.message}`);

      // ビデオごとのコメント数を計算
      const commentCounts: Record<string, number> = {};

      if (commentsData) {
        commentsData.forEach(comment => {
          if (comment.video_id) {
            commentCounts[comment.video_id] = (commentCounts[comment.video_id] || 0) + 1;
          }
        });
      }

      // 結果を整形
      const result: PopularVideo[] = videosData.map(video => ({
        videoId: video.id,
        youtubeId: video.youtube_id,
        title: video.title,
        viewCount: viewCounts[video.id] || 0,
        ratingAvg: parseFloat((ratingAverages[video.id] || 0).toFixed(1)),
        commentCount: commentCounts[video.id] || 0
      }));

      // ビュー数でソート
      result.sort((a, b) => b.viewCount - a.viewCount);
      setPopularVideos(result);

    } catch (err: any) {
      console.error('人気動画データの取得中にエラーが発生しました:', err);
      // エラーを表示するが、メイン統計は続行
    }
  };

  // ユーザー行動分析データの生成
  const fetchUserBehaviorData = (
    viewsData: any[],
    ratingsData: any[],
    commentsData: any[]
  ) => {
    try {
      const totalActions = viewsData.length + ratingsData.length + commentsData.length;

      if (totalActions === 0) {
        setUserBehavior([]);
        return;
      }

      const behaviorData: UserBehavior[] = [
        {
          action: '動画視聴',
          count: viewsData.length,
          percentage: parseFloat(((viewsData.length / totalActions) * 100).toFixed(1)),
          color: COLORS[0]
        },
        {
          action: '評価',
          count: ratingsData.length,
          percentage: parseFloat(((ratingsData.length / totalActions) * 100).toFixed(1)),
          color: COLORS[1]
        },
        {
          action: 'コメント',
          count: commentsData.length,
          percentage: parseFloat(((commentsData.length / totalActions) * 100).toFixed(1)),
          color: COLORS[2]
        },
      ];

      setUserBehavior(behaviorData);
    } catch (err: any) {
      console.error('ユーザー行動データの処理中にエラーが発生しました:', err);
      // エラーを表示するが、メイン統計は続行
    }
  };

  // 日付範囲変更時のデータ取得
  useEffect(() => {
    fetchStatisticsData();
  }, [dateRange]);

  // グラフタイプ変更ハンドラー
  const handleChartTypeChange = (datasetKey: DatasetKey, chartType: ChartType) => {
    setChartTypes(prev => ({
      ...prev,
      [datasetKey]: chartType
    }));
  };

  // 集計データ（ユーザー統計サマリー）
  const userStatsSummary = useMemo(() => {
    if (!statisticsData.length) return null;

    const totalNewUsers = statisticsData.reduce((sum, day) => sum + day.newUsers, 0);
    const totalPremiumConversions = statisticsData.reduce((sum, day) => sum + day.premiumConversions, 0);
    const conversionRate = totalNewUsers > 0
      ? ((totalPremiumConversions / totalNewUsers) * 100).toFixed(1)
      : '0';

    const averageDailyActive = (
      statisticsData.reduce((sum, day) => sum + day.activeUsers, 0) / statisticsData.length
    ).toFixed(0);

    return {
      totalNewUsers,
      totalPremiumConversions,
      conversionRate,
      averageDailyActive
    };
  }, [statisticsData]);

  // コンテンツ分析サマリー
  const contentStatsSummary = useMemo(() => {
    if (!contentAnalytics.length) return null;

    const totalViews = contentAnalytics.reduce((sum, genre) => sum + genre.viewCount, 0);
    const topGenre = [...contentAnalytics].sort((a, b) => b.viewCount - a.viewCount)[0];
    const averageRating = (
      contentAnalytics.reduce((sum, genre) => sum + genre.ratingAvg, 0) / contentAnalytics.length
    ).toFixed(1);

    return {
      totalViews,
      topGenre: topGenre?.genreName || '',
      averageRating
    };
  }, [contentAnalytics]);

  // ユーザー行動サマリー
  const behaviorStatsSummary = useMemo(() => {
    if (!userBehavior.length) return null;

    const totalActions = userBehavior.reduce((sum, action) => sum + action.count, 0);
    const mostCommonAction = [...userBehavior].sort((a, b) => b.count - a.count)[0];

    return {
      totalActions,
      mostCommonAction: mostCommonAction?.action || '',
      mostCommonPercentage: mostCommonAction?.percentage.toString() || '0'
    };
  }, [userBehavior]);

  // レンダリング
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">サイト分析ダッシュボード</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {/* 期間フィルター */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <span className="font-medium">期間:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setDateRange('7days')}
              className={`px-3 py-1 rounded ${dateRange === '7days'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              7日間
            </button>
            <button
              onClick={() => setDateRange('30days')}
              className={`px-3 py-1 rounded ${dateRange === '30days'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              30日間
            </button>
            <button
              onClick={() => setDateRange('90days')}
              className={`px-3 py-1 rounded ${dateRange === '90days'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              90日間
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* ユーザー統計サマリー */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-medium text-blue-800 mb-2">ユーザー統計</h3>
              {userStatsSummary && (
                <div className="space-y-2">
                  <p className="flex justify-between">
                    <span className="text-gray-600">新規ユーザー:</span>
                    <span className="font-semibold">{userStatsSummary.totalNewUsers}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">プレミアム登録:</span>
                    <span className="font-semibold">{userStatsSummary.totalPremiumConversions}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">変換率:</span>
                    <span className="font-semibold">{userStatsSummary.conversionRate}%</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">平均DAU:</span>
                    <span className="font-semibold">{userStatsSummary.averageDailyActive}</span>
                  </p>
                </div>
              )}
            </div>

            {/* コンテンツ分析サマリー */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-lg font-medium text-green-800 mb-2">コンテンツ分析</h3>
              {contentStatsSummary && (
                <div className="space-y-2">
                  <p className="flex justify-between">
                    <span className="text-gray-600">総視聴数:</span>
                    <span className="font-semibold">{contentStatsSummary.totalViews}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">人気ジャンル:</span>
                    <span className="font-semibold">{contentStatsSummary.topGenre}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">平均評価:</span>
                    <span className="font-semibold">{contentStatsSummary.averageRating}</span>
                  </p>
                </div>
              )}
            </div>

            {/* ユーザー行動サマリー */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="text-lg font-medium text-purple-800 mb-2">ユーザー行動</h3>
              {behaviorStatsSummary && (
                <div className="space-y-2">
                  <p className="flex justify-between">
                    <span className="text-gray-600">総アクション数:</span>
                    <span className="font-semibold">{behaviorStatsSummary.totalActions}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">最も多い行動:</span>
                    <span className="font-semibold">{behaviorStatsSummary.mostCommonAction}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">最多行動の割合:</span>
                    <span className="font-semibold">{behaviorStatsSummary.mostCommonPercentage}%</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ユーザー統計グラフ */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">ユーザー統計</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleChartTypeChange('userStats', 'line')}
                  className={`px-2 py-1 text-sm rounded ${chartTypes.userStats === 'line'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  折れ線
                </button>
                <button
                  onClick={() => handleChartTypeChange('userStats', 'bar')}
                  className={`px-2 py-1 text-sm rounded ${chartTypes.userStats === 'bar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  棒グラフ
                </button>
              </div>
            </div>

            <div className="h-96 w-full">
  <ResponsiveContainer width="100%" height="100%">
    {chartTypes.contentStats === 'line' ? (
      <LineChart
        data={statisticsData}
        margin={{ top: 20, right: 30, left: 30, bottom: 70 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
          tickMargin={20}
        />
        <YAxis width={40} />
        <Tooltip formatter={(value) => Number(value).toLocaleString()} />
        <Legend wrapperStyle={{ paddingTop: 20 }} />
        <Line
          type="monotone"
          dataKey="videoViews"
          name="視聴数"
          stroke="#ff7300"
        />
        <Line
          type="monotone"
          dataKey="uniqueViewers"
          name="ユニーク視聴者"
          stroke="#0088FE"
        />
        <Line
          type="monotone"
          dataKey="ratings"
          name="評価数"
          stroke="#00C49F"
        />
        <Line
          type="monotone"
          dataKey="comments"
          name="コメント数"
          stroke="#FFBB28"
        />
      </LineChart>
    ) : (
      <BarChart
        data={statisticsData}
        margin={{ top: 20, right: 30, left: 30, bottom: 70 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
          tickMargin={20}
        />
        <YAxis width={40} />
        <Tooltip formatter={(value) => Number(value).toLocaleString()} />
        <Legend wrapperStyle={{ paddingTop: 20 }} />
        <Bar dataKey="videoViews" name="視聴数" fill="#ff7300" />
        <Bar dataKey="uniqueViewers" name="ユニーク視聴者" fill="#0088FE" />
        <Bar dataKey="ratings" name="評価数" fill="#00C49F" />
        <Bar dataKey="comments" name="コメント数" fill="#FFBB28" />
      </BarChart>
    )}
  </ResponsiveContainer>
</div>
</div>

       {/* 動画視聴・評価・コメント統計 */}
<div className="mb-8">
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-lg font-medium">コンテンツ利用状況</h3>
    <div className="flex space-x-2">
      <button
        onClick={() => handleChartTypeChange('contentStats', 'line')}
        className={`px-2 py-1 text-sm rounded ${
          chartTypes.contentStats === 'line' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        折れ線
      </button>
      <button
        onClick={() => handleChartTypeChange('contentStats', 'bar')}
        className={`px-2 py-1 text-sm rounded ${
          chartTypes.contentStats === 'bar' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        棒グラフ
      </button>
    </div>
  </div>

  <div className="h-96 w-full">
    <ResponsiveContainer width="100%" height="100%">
      {chartTypes.contentStats === 'line' ? (
        <LineChart
          data={statisticsData}
          margin={{ top: 20, right: 30, left: 30, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
            tickMargin={20}
          />
          <YAxis width={40} />
          <Tooltip formatter={(value) => Number(value).toLocaleString()} />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
          <Line
            type="monotone"
            dataKey="videoViews"
            name="視聴数"
            stroke="#ff7300"
          />
          <Line
            type="monotone"
            dataKey="uniqueViewers"
            name="ユニーク視聴者"
            stroke="#0088FE"
          />
          <Line
            type="monotone"
            dataKey="ratings"
            name="評価数"
            stroke="#00C49F"
          />
          <Line
            type="monotone"
            dataKey="comments"
            name="コメント数"
            stroke="#FFBB28"
          />
        </LineChart>
      ) : (
        <BarChart
          data={statisticsData}
          margin={{ top: 20, right: 30, left: 30, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
            tickMargin={20}
          />
          <YAxis width={40} />
          <Tooltip formatter={(value) => Number(value).toLocaleString()} />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
          <Bar dataKey="videoViews" name="視聴数" fill="#ff7300" />
          <Bar dataKey="uniqueViewers" name="ユニーク視聴者" fill="#0088FE" />
          <Bar dataKey="ratings" name="評価数" fill="#00C49F" />
          <Bar dataKey="comments" name="コメント数" fill="#FFBB28" />
        </BarChart>
      )}
    </ResponsiveContainer>
  </div>
</div>

          {/* ジャンル分析とユーザー行動分析 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* ジャンル分析 */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">ジャンル別視聴状況</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleChartTypeChange('contentStats', 'bar')}
                    className={`px-2 py-1 text-sm rounded ${chartTypes.contentStats === 'bar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    棒グラフ
                  </button>
                  <button
                    onClick={() => handleChartTypeChange('contentStats', 'pie')}
                    className={`px-2 py-1 text-sm rounded ${chartTypes.contentStats === 'pie'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    円グラフ
                  </button>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartTypes.contentStats === 'bar' ? (
                    <BarChart
                      data={contentAnalytics}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="genreName"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                      <Legend />
                      <Bar dataKey="viewCount" name="視聴数" fill="#0088FE" />
                      <Bar dataKey="commentCount" name="コメント数" fill="#00C49F" />
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={contentAnalytics}
                        dataKey="viewCount"
                        nameKey="genreName"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ genreName, viewCount }) => `${genreName}: ${viewCount}`}
                      >
                        {contentAnalytics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                      <Legend />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* ユーザー行動分析 */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">ユーザー行動分析</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleChartTypeChange('behaviorStats', 'bar')}
                    className={`px-2 py-1 text-sm rounded ${chartTypes.behaviorStats === 'bar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    棒グラフ
                  </button>
                  <button
                    onClick={() => handleChartTypeChange('behaviorStats', 'pie')}
                    className={`px-2 py-1 text-sm rounded ${chartTypes.behaviorStats === 'pie'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    円グラフ
                  </button>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartTypes.behaviorStats === 'bar' ? (
                    <BarChart
                      data={userBehavior}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="action" />
                      <YAxis />
                      <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                      <Legend />
                      <Bar dataKey="count" name="アクション数" fill="#8884d8">
                        {userBehavior.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={userBehavior}
                        dataKey="count"
                        nameKey="action"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label={({ action, percentage }) => `${action}: ${percentage}%`}
                      >
                        {userBehavior.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => {
                        if (name === 'count') {
                          return [Number(value).toLocaleString(), 'アクション数'];
                        }
                        return [value, name];
                      }} />
                      <Legend />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 人気動画ランキング */}
          {popularVideos.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">人気動画ランキング</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">順位</th>
                      <th className="py-2 px-4 border-b text-left">動画タイトル</th>
                      <th className="py-2 px-4 border-b text-right">視聴数</th>
                      <th className="py-2 px-4 border-b text-right">評価</th>
                      <th className="py-2 px-4 border-b text-right">コメント数</th>
                      <th className="py-2 px-4 border-b text-center">リンク</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularVideos.map((video, index) => (
                      <tr key={video.videoId} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 px-4 border-b">{index + 1}</td>
                        <td className="py-2 px-4 border-b">
                          <div className="truncate max-w-md">{video.title}</div>
                        </td>
                        <td className="py-2 px-4 border-b text-right">{video.viewCount.toLocaleString()}</td>
                        <td className="py-2 px-4 border-b text-right">{video.ratingAvg.toFixed(1)}</td>
                        <td className="py-2 px-4 border-b text-right">{video.commentCount.toLocaleString()}</td>
                        <td className="py-2 px-4 border-b text-center">
                          <a
                            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                          >
                            YouTube
                          </a>
                          {' | '}
                          <a
                            href={`/video/${video.videoId}`}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            詳細
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* データエクスポートボタン */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => {
                // CSVデータの生成
                const csvData = [
                  // ヘッダー
                  ['日付', '新規ユーザー', 'アクティブユーザー', 'プレミアム登録', '視聴数', 'ユニーク視聴者', '評価数', 'コメント数'],
                  // データ
                  ...statisticsData.map((day: StatisticsData) => [
                    day.date,
                    day.newUsers,
                    day.activeUsers,
                    day.premiumConversions,
                    day.videoViews,
                    day.uniqueViewers,
                    day.ratings,
                    day.comments
                  ])
                ].map(row => row.join(',')).join('\n');

                // データのダウンロード
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `mytubenavi-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              データをエクスポート
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;