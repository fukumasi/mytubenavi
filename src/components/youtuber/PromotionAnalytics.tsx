// src/components/youtuber/PromotionAnalytics.tsx
import { useState, useMemo } from 'react';
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
import { usePromotionStats } from '@/hooks/usePromotionStats';
import PromotionCharts from './PromotionCharts';

type TimeRange = 'week' | 'month' | 'year';
type TrendDirection = 'up' | 'down' | 'neutral';

interface ChartDataItem {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue?: number;
}

interface SummaryStats {
  totalImpressions: number;
  totalClicks: number;
  avgCTR: number;
  totalRevenue: number;
  trend: {
    impressions: TrendDirection;
    clicks: TrendDirection;
    ctr: TrendDirection;
    revenue: TrendDirection;
  };
  growthRates: {
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
  }
}

export default function PromotionAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const { stats, chartData, loading, error } = usePromotionStats(timeRange);

  const summaryStats = useMemo<SummaryStats | null>(() => {
    if (!stats || !chartData?.length) return null;

    const totalImpressions = chartData.reduce((sum: number, item: ChartDataItem) => sum + item.impressions, 0);
    const totalClicks = chartData.reduce((sum: number, item: ChartDataItem) => sum + item.clicks, 0);
    const totalRevenue = chartData.reduce((sum: number, item: ChartDataItem) => sum + (item.revenue || 0), 0);
    const avgCTR = stats.ctr;

    return {
      totalImpressions,
      totalClicks,
      avgCTR,
      totalRevenue,
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
    };
  }, [stats, chartData]);

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

  const handleExportCSV = () => {
    if (!chartData || chartData.length === 0) return;
    
    const headers = ['日付', 'インプレッション', 'クリック数', 'CTR(%)', '収益(円)'];
    
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
          >
            再試行
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <BarChart2 className="h-5 w-5 text-indigo-600 mr-2" />
          広告効果分析
        </h2>
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
            label="総収益"
            value={`¥${summaryStats.totalRevenue.toLocaleString()}`}
            trend={summaryStats.trend.revenue}
            icon={DollarSign}
            growthRate={summaryStats.growthRates.revenue}
          />
        </div>
      )}

      {stats?.topSlots && stats.topSlots.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-900 mb-4">掲載枠別パフォーマンス</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topSlots.map((slot) => (
              <div key={slot.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-200 transition-colors">
                <h4 className="font-medium text-gray-900 mb-2 truncate">{slot.name}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500">収益</p>
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

      {/* 改良されたチャート */}
      {chartData && chartData.length > 0 && (
        <div className="mb-8">
          <PromotionCharts 
            data={chartData} 
            timeRange={timeRange} 
          />
        </div>
      )}
      
      {/* 詳細データテーブル */}
      {chartData && chartData.length > 0 && <DataTable data={chartData} />}
      
      {/* データがない場合 */}
      {(!chartData || chartData.length === 0) && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <Calendar className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-yellow-800 mb-2">選択した期間のデータがありません</h3>
          <p className="text-yellow-700 mb-4">別の期間を選択してください。</p>
          <button
            onClick={() => setTimeRange('year')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            年間表示
          </button>
        </div>
      )}
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

function DataTable({ data }: { data: ChartDataItem[] }) {
  const headers = [
    { key: 'date', label: '日付' },
    { key: 'impressions', label: 'インプレッション' },
    { key: 'clicks', label: 'クリック数' },
    { key: 'ctr', label: 'CTR' },
    { key: 'revenue', label: '収益' }
  ];

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-gray-900 mb-4">詳細データ</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {headers.map(({ key, label }) => (
                <th
                  key={key}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.date} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(item.date).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.impressions.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.clicks.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.ctr.toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.revenue ? `¥${item.revenue.toLocaleString()}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}