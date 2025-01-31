import { BarChart2, TrendingUp, Users, DollarSign } from 'lucide-react';

interface PromotionStatsProps {
  stats: {
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
  };
}

export default function PromotionStats({ stats }: PromotionStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">インプレッション</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.impressions.toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-1">+12.5% 先週比</p>
          </div>
          <BarChart2 className="h-8 w-8 text-indigo-600" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">クリック数</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.clicks.toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-1">+8.3% 先週比</p>
          </div>
          <TrendingUp className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">CTR</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.ctr.toFixed(2)}%
            </p>
            <p className="text-sm text-green-600 mt-1">+2.1% 先週比</p>
          </div>
          <Users className="h-8 w-8 text-yellow-500" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">広告収益</p>
            <p className="text-2xl font-bold text-gray-900">
              ¥{stats.revenue.toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-1">+15.8% 先週比</p>
          </div>
          <DollarSign className="h-8 w-8 text-red-600" />
        </div>
      </div>
    </div>
  );
}