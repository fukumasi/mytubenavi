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
  Legend,
  TooltipProps
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

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

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export default function PromotionCharts({ data, timeRange }: PromotionChartsProps) {
  const formatXAxis = (date: string) => {
    const d = new Date(date);
    const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
      week: { weekday: 'short' as const },
      month: { day: 'numeric' as const },
      year: { month: 'short' as const }
    };

    return d.toLocaleDateString('ja-JP', formatOptions[timeRange]);
  };

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const getValueLabel = (name: string) => {
      const labels: Record<string, string> = {
        impressions: 'インプレッション',
        clicks: 'クリック数',
        ctr: 'CTR'
      };
      return labels[name] || name;
    };

    const formatValue = (name: string, value: number) => {
      return name === 'ctr' ? `${value.toFixed(2)}%` : value.toLocaleString();
    };

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-gray-900 mb-2">
          {label && new Date(label).toLocaleDateString('ja-JP')}
        </p>
        {payload.map((entry) => (
          <p
            key={entry.name}
            className="text-sm"
            style={{ color: entry.color }}
          >
            {`${getValueLabel(entry.name)}: ${formatValue(entry.name, entry.value)}`}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                fontSize={12}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={(value: number) => value.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                height={36}
                fontSize={12}
              />
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
                fontSize={12}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                height={36}
                fontSize={12}
              />
              <Bar
                dataKey="ctr"
                name="CTR"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}