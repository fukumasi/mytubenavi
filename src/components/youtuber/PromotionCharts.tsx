import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ChartData {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface PromotionChartsProps {
  data: ChartData[];
  timeRange: 'week' | 'month' | 'year';
}

export default function PromotionCharts({ data, timeRange }: PromotionChartsProps) {
  // 日付フォーマットの調整
  const formatXAxis = (date: string) => {
    const d = new Date(date);
    switch (timeRange) {
      case 'week':
        return d.toLocaleDateString('ja-JP', { weekday: 'short' });
      case 'month':
        return d.toLocaleDateString('ja-JP', { day: 'numeric' });
      case 'year':
        return d.toLocaleDateString('ja-JP', { month: 'short' });
      default:
        return date;
    }
  };

  // ツールチップのカスタマイズ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {new Date(label).toLocaleDateString('ja-JP')}
          </p>
          {payload.map((entry: any) => (
            <p
              key={entry.name}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name === 'impressions' && 'インプレッション: '}
              {entry.name === 'clicks' && 'クリック数: '}
              {entry.name === 'ctr' && 'CTR: '}
              {entry.name === 'ctr'
                ? `${entry.value.toFixed(2)}%`
                : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* インプレッション推移グラフ */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">インプレッション推移</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#6B7280"
              />
              <YAxis stroke="#6B7280" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="impressions"
                name="インプレッション"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CTR推移グラフ */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">CTR推移</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#6B7280"
              />
              <YAxis
                stroke="#6B7280"
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="ctr"
                name="CTR"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}