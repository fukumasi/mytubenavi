// src/components/youtuber/PromotionAnalytics.tsx

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnalyticsDashboard from './AnalyticsDashboard';
import { usePromotionStats } from '@/hooks/usePromotionStats';
import {
  AlertCircle,
  Loader2,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  DownloadIcon,
  BarChart2,
  DollarSign,
  Calendar
} from 'lucide-react';

type TimeRange = 'week' | 'month' | 'year';
type TrendDirection = 'up' | 'down' | 'neutral';


export default function PromotionAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [activeTab, setActiveTab] = useState('overview');
  const { stats, chartData, loading, error } = usePromotionStats(timeRange);
  // AnalyticsDashboardの選択されたタブを追跡
  const [detailedTab, setDetailedTab] = useState<string>('video');

  function calculateTrend(values: number[]): TrendDirection {
    if (values.length < 2) return 'neutral';
    // 直近の3ポイントを見て傾向を判断
    const recentValues = values.slice(-3);
    const avg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const lastValue = values[values.length - 1];
    const diff = lastValue - avg;
    
    if (Math.abs(diff) < avg * 0.05) return 'neutral'; // 変化が平均の5%未満ならニュートラル
    return diff > 0 ? 'up' : 'down';
  }

  const summaryStats = stats && chartData?.length ? {
    totalImpressions: chartData.reduce((sum, item) => sum + item.impressions, 0),
    totalClicks: chartData.reduce((sum, item) => sum + item.clicks, 0),
    avgCTR: stats.ctr,
    totalRevenue: chartData.reduce((sum, item) => sum + (item.revenue || 0), 0),
    trend: {
      impressions: calculateTrend(chartData.map(d => d.impressions)),
      clicks: calculateTrend(chartData.map(d => d.clicks)),
      ctr: calculateTrend(chartData.map(d => d.ctr)),
      revenue: calculateTrend(chartData.map(d => d.revenue || 0))
    },
    growthRates: {
      impressions: 0, // データがないため0に設定
      clicks: 0,
      ctr: 0,
      revenue: 0
    }
  } : null;

  const handleExportCSV = () => {
    if (!chartData || chartData.length === 0) return;
    
    const headers = ['日付', 'インプレッション', 'クリック数', 'CTR(%)', '掲載費(円)'];
    
    const csvRows = [
      headers.join(','),
      ...chartData.map(item => [
        new Date(item.date).toLocaleDateString('ja-JP'),
        item.impressions,
        item.clicks,
        item.ctr.toFixed(2),
        (item.revenue || 0).toLocaleString()
      ].join(','))
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // BOMを追加して日本語対応
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `プロモーション分析_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AnalyticsDashboardのタブを直接選択するための関数
  const handleDetailedTabSelect = (tab: string) => {
    console.log("詳細タブ選択:", tab); // デバッグログ
    setDetailedTab(tab);
    // 詳細分析タブに切り替え
    setActiveTab('detailed');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">データを分析中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
        <AlertCircle className="text-red-500 h-5 w-5 mr-2 flex-shrink-0" />
        <div>
          <h3 className="text-red-800 font-medium">エラーが発生しました</h3>
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-white bg-red-600 px-3 py-1 rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  const timeRangeLabels: Record<TimeRange, string> = {
    week: '週間',
    month: '月間',
    year: '年間'
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <TabsList>
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="detailed">詳細分析</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              {(Object.keys(timeRangeLabels) as TimeRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors
                    ${timeRange === range
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {timeRangeLabels[range]}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              disabled={!chartData || chartData.length === 0}
            >
              <DownloadIcon className="h-4 w-4 mr-1" />
              CSVエクスポート
            </button>
          </div>
        </div>
        
        <TabsContent value="overview" className="mt-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center mb-6">
              <BarChart2 className="h-5 w-5 text-indigo-600 mr-2" />
              掲載効果概要
            </h2>
            
            {/* 概要統計カード */}
            {summaryStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  label="インプレッション"
                  value={summaryStats.totalImpressions.toLocaleString()}
                  trend={summaryStats.trend.impressions}
                  growthRate={summaryStats.growthRates.impressions}
                />
                <StatCard
                  label="クリック数"
                  value={summaryStats.totalClicks.toLocaleString()}
                  trend={summaryStats.trend.clicks}
                  growthRate={summaryStats.growthRates.clicks}
                />
                <StatCard
                  label="平均CTR"
                  value={`${summaryStats.avgCTR.toFixed(2)}%`}
                  trend={summaryStats.trend.ctr}
                  growthRate={summaryStats.growthRates.ctr}
                />
                <StatCard
                  label="総掲載費"
                  value={`¥${summaryStats.totalRevenue.toLocaleString()}`}
                  trend={summaryStats.trend.revenue}
                  icon={DollarSign}
                  growthRate={summaryStats.growthRates.revenue}
                />
              </div>
            )}

            {/* 掲載枠別パフォーマンス */}
            {stats?.topSlots && stats.topSlots.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-900 mb-4">掲載枠別パフォーマンス</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.topSlots.map((slot) => (
                    <div key={slot.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-200 transition-colors">
                      <h4 className="font-medium text-gray-900 mb-2 truncate">{slot.name}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-500">掲載費</p>
                          <p className="text-sm font-medium">¥{slot.revenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">CTR</p>
                          <p className="text-sm font-medium">{slot.ctr.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">インプレッション</p>
                          <p className="text-sm font-medium">{slot.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">クリック</p>
                          <p className="text-sm font-medium">{slot.clicks.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 詳細分析リンク - 常に表示 */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">詳細な掲載効果分析</h3>
              <p className="text-sm text-gray-600 mb-4">
                より詳しい掲載効果の分析や、掲載前後の比較データを確認するには詳細分析をご利用ください。
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDetailedTabSelect('video')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  動画パフォーマンス分析
                </button>
                <button
                  onClick={() => handleDetailedTabSelect('effect')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  掲載効果分析を見る
                </button>
                <button
                  onClick={() => handleDetailedTabSelect('genre')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  ジャンル別分析
                </button>
              </div>
            </div>
            
            {/* データがない場合のメッセージ */}
            {(!chartData || chartData.length === 0) && !loading && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center mt-6">
                <Calendar className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-yellow-800 mb-2">動画掲載を開始しましょう</h3>
                <p className="text-yellow-700 mb-4">作成した掲載枠に動画を掲載して、視聴者層を拡大しましょう</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setTimeRange('year')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                  >
                    年間表示
                  </button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="detailed" className="mt-6">
          {/* 初期表示タブを設定したAnalyticsDashboardを渡す */}
          <AnalyticsDashboard initialTab={detailedTab} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  trend: TrendDirection;
  subValue?: string;
  icon?: React.ElementType;
  growthRate?: number;
}

function StatCard({ label, value, trend, subValue, icon: CustomIcon, growthRate }: StatCardProps) {
  const trendConfig = {
    up: { icon: ArrowUpIcon, color: 'text-green-500', bg: 'bg-green-50' },
    down: { icon: ArrowDownIcon, color: 'text-red-500', bg: 'bg-red-50' },
    neutral: { icon: MinusIcon, color: 'text-gray-500', bg: 'bg-gray-50' }
  };

  const { icon: Icon, color, bg } = trendConfig[trend];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`p-2 rounded-full ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          {growthRate !== undefined && (
            <div className={`text-xs font-medium ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
            </div>
          )}
          {CustomIcon && (
            <div className="p-2 rounded-full bg-indigo-50">
              <CustomIcon className="h-5 w-5 text-indigo-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


