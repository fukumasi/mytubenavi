import { useState, useMemo } from 'react';
import {
  AlertCircle,
  Loader2,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePromotionStats } from '../../hooks/usePromotionStats';
import PromotionCharts from './PromotionCharts';

type TimeRange = 'week' | 'month' | 'year';
type TrendDirection = 'up' | 'down' | 'neutral';

interface ChartDataItem {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface SummaryStats {
  totalImpressions: number;
  totalClicks: number;
  avgCTR: number;
  trend: {
    impressions: TrendDirection;
    clicks: TrendDirection;
    ctr: TrendDirection;
  };
}

export default function PromotionAnalytics() {
  useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { stats, chartData, loading, error } = usePromotionStats(timeRange);

  const summaryStats = useMemo<SummaryStats | null>(() => {
    if (!stats || !chartData?.length) return null;

    const totalImpressions = chartData.reduce((sum, item) => sum + item.impressions, 0);
    const totalClicks = chartData.reduce((sum, item) => sum + item.clicks, 0);
    const avgCTR = stats.ctr;

    return {
      totalImpressions,
      totalClicks,
      avgCTR,
      trend: {
        impressions: calculateTrend(chartData.map(d => d.impressions)),
        clicks: calculateTrend(chartData.map(d => d.clicks)),
        ctr: calculateTrend(chartData.map(d => d.ctr))
      }
    };
  }, [stats, chartData]);

  function calculateTrend(values: number[]): TrendDirection {
    if (values.length < 2) return 'neutral';
    const lastChange = values[values.length - 1] - values[values.length - 2];
    if (Math.abs(lastChange) < 0.001) return 'neutral';
    return lastChange > 0 ? 'up' : 'down';
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
        <AlertCircle className="text-red-500 h-5 w-5 mr-2" />
        <span className="text-red-700">{error}</span>
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">広告効果分析</h2>
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
      </div>

      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="インプレッション"
            value={summaryStats.totalImpressions.toLocaleString()}
            trend={summaryStats.trend.impressions}
          />
          <StatCard
            label="クリック数"
            value={summaryStats.totalClicks.toLocaleString()}
            trend={summaryStats.trend.clicks}
          />
          <StatCard
            label="平均CTR"
            value={`${summaryStats.avgCTR.toFixed(2)}%`}
            trend={summaryStats.trend.ctr}
          />
        </div>
      )}

      {chartData && <PromotionCharts data={chartData} timeRange={timeRange} />}
      {chartData && <DataTable data={chartData} />}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  trend: TrendDirection;
}

function StatCard({ label, value, trend }: StatCardProps) {
  const trendConfig = {
    up: { icon: ArrowUpIcon, color: 'text-green-500', bg: 'bg-green-50' },
    down: { icon: ArrowDownIcon, color: 'text-red-500', bg: 'bg-red-50' },
    neutral: { icon: MinusIcon, color: 'text-gray-500', bg: 'bg-gray-50' }
  };

  const { icon: Icon, color, bg } = trendConfig[trend];

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-full ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
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
    { key: 'ctr', label: 'CTR' }
  ];

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-gray-900 mb-4">詳細データ</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}