// src/components/youtuber/AnalyticsDashboard.tsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Eye, Calendar, ArrowUpIcon, ArrowDownIcon, AlertTriangle, BarChart2, Activity } from 'lucide-react';
import { analyticsService, VideoPerformanceData, ChannelGrowthData, GenrePerformanceData, PromotionEffectData } from '@/services/analyticsService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import VideoPerformanceChart from './charts/VideoPerformanceChart';

type TimeRange = '1week' | '1month' | '3months' | '1year';
type TabValue = 'video' | 'channel' | 'genre' | 'effect' | 'roi';

// props型を定義
interface AnalyticsDashboardProps {
  initialTab?: string;
}

// 関数定義を変更
export default function AnalyticsDashboard({ initialTab = 'video' }: AnalyticsDashboardProps) {
  console.log("初期化時 - initialTab:", initialTab);
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('1month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 有効なタブ値の検証
  const validTabs = ['video', 'channel', 'genre', 'effect', 'roi'];
  
  // タブの初期設定
  const initialTabRef = useRef<string>(initialTab);
  const validInitialTab = validTabs.includes(initialTabRef.current) 
    ? initialTabRef.current as TabValue 
    : 'video';
  
  // activeTabの状態を管理（初期値を設定）
  const [activeTab, setActiveTab] = useState<TabValue>(validInitialTab);
  
  const [videoData, setVideoData] = useState<VideoPerformanceData[]>([]);
  const [channelData, setChannelData] = useState<ChannelGrowthData[]>([]);
  const [genreData, setGenreData] = useState<GenrePerformanceData[]>([]);
  const [promotionEffectData, setPromotionEffectData] = useState<PromotionEffectData[]>([]);
  const [roi, setRoi] = useState({ totalSpent: 0, estimatedRevenue: 0, roi: 0 });
  
  // マウント時および initialTab 変更時にタブを更新
  useEffect(() => {
    console.log("useEffect実行 - initialTab:", initialTab);
    // initialTabが変更された場合は、validationをして更新
    if (initialTab && initialTab !== initialTabRef.current) {
      initialTabRef.current = initialTab;
      
      const validTab = validTabs.includes(initialTab) 
        ? initialTab as TabValue 
        : 'video';
        
      console.log("initialTabから activeTab を更新:", initialTab, "->", validTab);
      setActiveTab(validTab);
    }
  }, [initialTab]); // 依存配列はinitialTabのみ
  
  // 明示的にタブ切り替えを処理する関数を追加
  const handleTabChange = (value: string) => {
    console.log("タブを明示的に変更:", value);
    if (validTabs.includes(value)) {
      setActiveTab(value as TabValue);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // 並列でデータを取得
        const [videoPerfData, channelGrowthData, genrePerfData, roiData, effectData] = await Promise.all([
          analyticsService.getVideoPerformance(user.id, timeRange),
          analyticsService.getChannelGrowth(user.id, timeRange),
          analyticsService.getGenrePerformance(user.id, timeRange),
          analyticsService.calculateROI(user.id, timeRange),
          analyticsService.getPromotionEffectAnalysis(user.id, timeRange)
        ]);
        
        setVideoData(videoPerfData);
        setChannelData(channelGrowthData);
        setGenreData(genrePerfData);
        setRoi(roiData);
        setPromotionEffectData(effectData);
        
      } catch (err) {
        console.error('分析データの取得に失敗しました:', err);
        setError('データの取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, timeRange]);
  
  // コンポーネント描画後に一度だけ実行
  useEffect(() => {
    // 初期レンダリング後、activeTabの値を確認してコンソールに出力
    console.log("コンポーネントマウント完了 - activeTab:", activeTab);
  }, []);
  
  // 指標の計算
  const calculateMetrics = () => {
    if (channelData.length < 2) return { subscriberGrowth: 0, viewGrowth: 0 };
    
    // 期間の最初と最後のデータポイント
    const firstPoint = channelData[0];
    const lastPoint = channelData[channelData.length - 1];
    
    // 成長率の計算
    const subscriberGrowth = firstPoint.subscribers > 0
      ? ((lastPoint.subscribers - firstPoint.subscribers) / firstPoint.subscribers) * 100
      : 0;
      
    const viewGrowth = firstPoint.views > 0
      ? ((lastPoint.views - firstPoint.views) / firstPoint.views) * 100
      : 0;
      
    return { subscriberGrowth, viewGrowth };
  };
  
  const metrics = calculateMetrics();

  // メトリクスの数値が不自然に大きいかどうかをチェックする関数
  const isUnrealisticData = () => {
    // 10%以上の急激な成長または大きな視聴増加は不自然と見なす
    return metrics.subscriberGrowth > 10 || metrics.viewGrowth > 30;
  };
  
  const timeRangeLabels: Record<TimeRange, string> = {
    '1week': '1週間',
    '1month': '1か月',
    '3months': '3か月',
    '1year': '1年'
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  console.log("レンダリング時 - activeTab:", activeTab, "initialTab:", initialTab);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">YouTuberパフォーマンス分析</h2>
          <p className="text-muted-foreground">
            掲載効果や視聴者増加の詳細分析
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {(Object.keys(timeRangeLabels) as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              {timeRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>
      
      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総掲載費用</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{roi.totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              選択期間内の総予算
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">チャンネル登録者増加</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {channelData.length > 0 && !isUnrealisticData() ? (
                <>
                  {channelData[channelData.length-1].subscribers - channelData[0].subscribers}
                  <span className="ml-2 text-xs font-normal flex items-center">
                    {metrics.subscriberGrowth > 0 ? (
                      <>
                        <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                        <span className="text-green-500">{metrics.subscriberGrowth.toFixed(1)}%</span>
                      </>
                    ) : metrics.subscriberGrowth < 0 ? (
                      <>
                        <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                        <span className="text-red-500">{Math.abs(metrics.subscriberGrowth).toFixed(1)}%</span>
                      </>
                    ) : (
                      <span className="text-gray-500">0%</span>
                    )}
                  </span>
                </>
              ) : (
                <>0<span className="ml-2 text-xs font-normal text-gray-500">0%</span></>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeRangeLabels[timeRange]}の新規登録者数
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">視聴回数増加</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {channelData.length > 0 && !isUnrealisticData() ? (
                <>
                  {(channelData[channelData.length-1].views - channelData[0].views).toLocaleString()}
                  <span className="ml-2 text-xs font-normal flex items-center">
                    {metrics.viewGrowth > 0 ? (
                      <>
                        <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                        <span className="text-green-500">{metrics.viewGrowth.toFixed(1)}%</span>
                      </>
                    ) : metrics.viewGrowth < 0 ? (
                      <>
                        <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                        <span className="text-red-500">{Math.abs(metrics.viewGrowth).toFixed(1)}%</span>
                      </>
                    ) : (
                      <span className="text-gray-500">0%</span>
                    )}
                  </span>
                </>
              ) : (
                <>0<span className="ml-2 text-xs font-normal text-gray-500">0%</span></>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeRangeLabels[timeRange]}の総視聴回数増加
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">投資対効果(ROI)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roi.roi > 0 ? (
                <span className="text-green-600">+{roi.roi.toFixed(1)}%</span>
              ) : roi.roi < 0 ? (
                <span className="text-red-600">{roi.roi.toFixed(1)}%</span>
              ) : (
                <span className="text-gray-600">0.0%</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              推定YouTube収益ベース
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs 
        defaultValue={activeTab} 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="video">動画パフォーマンス</TabsTrigger>
          <TabsTrigger value="channel">チャンネル成長</TabsTrigger>
          <TabsTrigger value="genre">ジャンル別</TabsTrigger>
          <TabsTrigger value="effect">掲載効果分析</TabsTrigger>
          <TabsTrigger value="roi">投資対効果</TabsTrigger>
        </TabsList>
        
        {/* タブの内容 */}
        <TabsContent value="video" className="space-y-6 mt-4">
          {videoData.length > 0 ? (
            <VideoPerformanceChart data={videoData} />
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <Calendar className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-yellow-800 mb-2">掲載中の動画データがありません</h3>
              <p className="text-yellow-700 mb-4">選択した期間内に掲載された動画がないか、分析データがまだ収集されていません。</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setTimeRange('1year')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  より長い期間で表示
                </button>
              </div>
            </div>
          )}
          
          {/* 動画一覧表 - 内容は変更なしのため省略 */}
          {videoData.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* 内容は元のコードと同じ */}
              {/* ... */}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="channel" className="space-y-6 mt-4">
          {/* チャンネル成長チャート - 内容は変更なしのため省略 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* 内容は元のコードと同じ */}
            {/* ... */}
          </div>
          
          {/* 指標の説明 - 内容は変更なしのため省略 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* 内容は元のコードと同じ */}
            {/* ... */}
          </div>
        </TabsContent>
        
        <TabsContent value="genre" className="space-y-6 mt-4">
          {/* ジャンル分析 - 内容は変更なしのため省略 */}
          {genreData.length > 0 ? (
            <>
              {/* 内容は元のコードと同じ */}
              {/* ... */}
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-yellow-800 mb-2">ジャンル別データがありません</h3>
              <p className="text-yellow-700 mb-4">選択した期間内にジャンル別の掲載がないか、分析データがまだ収集されていません。</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setTimeRange('1year')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  より長い期間で表示
                </button>
              </div>
            </div>
          )}
        </TabsContent>
        
        {/* 掲載効果分析タブ */}
        <TabsContent value="effect" className="space-y-6 mt-4">
          {promotionEffectData.length > 0 ? (
            <>
              {/* 掲載効果サマリー */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">掲載効果の詳細分析</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <BarChart2 className="h-8 w-8 text-purple-500 mb-3" />
                    <h4 className="text-sm font-medium text-purple-900 mb-1">掲載中の視聴回数増加（平均）</h4>
                    <p className="text-xl font-bold text-purple-900 mb-1">
                      {promotionEffectData.length > 0 
                        ? Math.round(
                            promotionEffectData.reduce(
                              (sum, item) => sum + item.impact.viewCountIncrease, 
                              0
                            ) / promotionEffectData.length
                          ).toLocaleString()
                        : 0
                      }
                    </p>
                    <p className="text-sm text-purple-700">
                      {promotionEffectData.length > 0 
                        ? `+${Math.round(
                            promotionEffectData.reduce(
                              (sum, item) => sum + item.impact.viewCountIncreasePercent, 
                              0
                            ) / promotionEffectData.length
                          ).toFixed(1)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <Users className="h-8 w-8 text-blue-500 mb-3" />
                    <h4 className="text-sm font-medium text-blue-900 mb-1">登録者増加効果（平均）</h4>
                    <p className="text-xl font-bold text-blue-900 mb-1">
                      {promotionEffectData.length > 0 
                        ? Math.round(
                            promotionEffectData.reduce(
                              (sum, item) => sum + item.impact.subscriberGainIncrease, 
                              0
                            ) / promotionEffectData.length
                          ).toLocaleString()
                        : 0
                      }
                    </p>
                    <p className="text-sm text-blue-700">
                      掲載期間中の追加獲得
                    </p>
                  </div>
                  
                  <div className="bg-emerald-50 p-6 rounded-lg">
                    <Activity className="h-8 w-8 text-emerald-500 mb-3" />
                    <h4 className="text-sm font-medium text-emerald-900 mb-1">日次平均視聴増加（平均）</h4>
                    <p className="text-xl font-bold text-emerald-900 mb-1">
                      {promotionEffectData.length > 0 
                        ? Math.round(
                            promotionEffectData.reduce(
                              (sum, item) => sum + item.impact.dailyAverageViewsIncrease, 
                              0
                            ) / promotionEffectData.length
                          ).toLocaleString()
                        : 0
                      }
                    </p>
                    <p className="text-sm text-emerald-700">
                      {promotionEffectData.length > 0 
                        ? `+${Math.round(
                            promotionEffectData.reduce(
                              (sum, item) => sum + item.impact.dailyAverageViewsIncreasePercent, 
                              0
                            ) / promotionEffectData.length
                          ).toFixed(1)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                </div>
                
                {/* 掲載効果比較チャート（掲載前・中・後） */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-800 mb-4">掲載前後の効果比較</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={promotionEffectData.map(item => ({
                          name: item.title.length > 20 ? item.title.substring(0, 17) + '...' : item.title,
                          youtubeId: item.youtubeId,
                          '掲載前': item.beforePromotion.dailyAverageViews,
                          '掲載中': item.duringPromotion.dailyAverageViews,
                          '掲載後': item.afterPromotion.dailyAverageViews
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                          interval={0}
                        />
                        <YAxis label={{ value: '日平均視聴回数', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value: any) => [value.toLocaleString(), '']}
                          labelFormatter={(name) => {
                            const item = promotionEffectData.find(
                              item => item.title === name || 
                              (name.length > 20 && item.title.startsWith(name.substring(0, 17)))
                            );
                            return item?.title || name;
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="掲載前" 
                          fill="#94a3b8"
                        />
                        <Bar 
                          dataKey="掲載中" 
                          fill="#6366f1"
                        />
                        <Bar 
                          dataKey="掲載後" 
                          fill="#10b981"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              {/* 動画ごとの掲載効果詳細 - 内容は変更なしのため省略 */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* 内容は元のコードと同じ */}
                {/* ... */}
              </div>
              
              {/* 掲載効果の解説 - 内容は変更なしのため省略 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* 内容は元のコードと同じ */}
                {/* ... */}
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-yellow-800 mb-2">掲載効果分析データがありません</h3>
              <p className="text-yellow-700 mb-4">
                選択した期間内に完了した掲載がない、または十分な分析データが収集されていません。
                より長い期間を選択するか、掲載完了後にもう一度確認してください。
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => setTimeRange('1year')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  より長い期間で表示
                </button>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="roi" className="space-y-6 mt-4">
          {/* ROI分析 - 内容は変更なしのため省略 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* 内容は元のコードと同じ */}
            {/* ... */}
          </div>
          
          {/* ROI向上のためのヒント - 内容は変更なしのため省略 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* 内容は元のコードと同じ */}
            {/* ... */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}