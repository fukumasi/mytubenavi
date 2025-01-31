import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPromotionStats } from '../../hooks/usePromotionStats';
import PromotionCharts from './PromotionCharts';
import { InfoIcon, TrendingUpIcon, AlertCircle } from 'lucide-react';

interface AnalyticsData {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue?: number;
}

interface PromotionAnalyticsProps {
  initialData?: AnalyticsData[];
}

export default function PromotionAnalytics({ initialData = [] }: PromotionAnalyticsProps) {
  const { currentUser } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [data, setData] = useState<AnalyticsData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      setLoading(true);
      setError(null);

      try {
        const endDate = new Date();
        const startDate = new Date();

        switch (timeRange) {
          case 'week':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        }

        const promotionStats = await getPromotionStats(currentUser.id, startDate, endDate);
        setData(promotionStats);
      } catch (err) {
        console.error('プロモーション統計の取得エラー:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, timeRange]);

  const summaryStats = useMemo(() => {
    if (data.length === 0) return null;

    const totalImpressions = data.reduce((sum, item) => sum + item.impressions, 0);
    const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      totalImpressions,
      totalClicks,
      avgCtr,
      trend: {
        impressions: calculateTrend(data.map(d => d.impressions)),
        clicks: calculateTrend(data.map(d => d.clicks)),
        ctr: calculateTrend(data.map(d => d.ctr))
      }
    };
  }, [data]);

  function calculateTrend(values: number[]): 'up' | 'down' | 'neutral' {
    if (values.length < 2) return 'neutral';
    const lastChange = values[values.length - 1] - values[values.length - 2];
    return lastChange > 0 ? 'up' : lastChange < 0 ? 'down' : 'neutral';
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">広告効果分析</h2>
        
        <div className="flex items-center space-x-2">
          {['week', 'month', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range as 'week' | 'month' | 'year')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                timeRange === range
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range === 'week' ? '週間' : range === 'month' ? '月間' : '年間'}
            </button>
          ))}
        </div>
      </div>

      {summaryStats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'インプレッション', value: summaryStats.totalImpressions, trend: summaryStats.trend.impressions },
            { label: 'クリック数', value: summaryStats.totalClicks, trend: summaryStats.trend.clicks },
            { label: '平均CTR', value: summaryStats.avgCtr.toFixed(2) + '%', trend: summaryStats.trend.ctr }
          ].map(({ label, value, trend }) => (
            <StatCard key={label} label={label} value={value} trend={trend} />
          ))}
        </div>
      )}

      <PromotionCharts data={data} timeRange={timeRange} />

      <DetailedDataTable data={data} />
    </div>
  );
}

function StatCard({ label, value, trend }: { label: string, value: number | string, trend: 'up' | 'down' | 'neutral' }) {
  const trendIcon = {
    up: <TrendingUpIcon className="text-green-500" />,
    down: <AlertCircle className="text-red-500" />,
    neutral: <InfoIcon className="text-gray-500" />
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg flex items-center space-x-4">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      {trendIcon[trend]}
    </div>
  );
}

function DetailedDataTable({ data }: { data: AnalyticsData[] }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-gray-900 mb-4">詳細データ</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['日付', 'インプレッション', 'クリック数', 'CTR'].map(header => (
                <th 
                  key={header}
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.date}>
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

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
      <AlertCircle className="text-red-500 mr-2" />
      <span className="text-red-700">{message}</span>
    </div>
  );
}