// src/components/youtuber/charts/VideoPerformanceChart.tsx
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VideoPerformanceData } from '@/services/analyticsService';

type MetricType = 'views' | 'cost' | 'ctr' | 'cpc' | 'cpv';

interface VideoPerformanceChartProps {
  data: VideoPerformanceData[];
}

export default function VideoPerformanceChart({ data }: VideoPerformanceChartProps) {
  const [metric, setMetric] = useState<MetricType>('views');
  
  const chartData = data.map(item => {
    const title = item.title.length > 20 ? item.title.substring(0, 17) + '...' : item.title;
    return {
      name: title,
      youtubeId: item.youtubeId,
      views: item.viewCount,
      cost: item.cost,
      ctr: parseFloat(item.ctr.toFixed(2)),
      cpc: parseFloat(item.costPerClick.toFixed(2)),
      cpv: parseFloat(item.costPerView.toFixed(2))
    };
  });
  
  const metricLabels: Record<MetricType, string> = {
    views: '再生回数',
    cost: '掲載費用',
    ctr: 'クリック率 (%)',
    cpc: 'クリック単価',
    cpv: '視聴単価'
  };
  
  const metricColors: Record<MetricType, string> = {
    views: '#4338ca',
    cost: '#059669',
    ctr: '#d97706',
    cpc: '#dc2626',
    cpv: '#7c3aed'
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">動画パフォーマンス分析</h3>
        <div className="flex space-x-2">
          {(Object.keys(metricLabels) as MetricType[]).map(key => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
                ${metric === key
                  ? `bg-${metricColors[key].replace('#', '')} text-white`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              style={metric === key ? { backgroundColor: metricColors[key] } : {}}
            >
              {metricLabels[key]}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name"
              angle={-45} 
              textAnchor="end"
              height={70}
              interval={0}
            />
            <YAxis />
            <Tooltip
              formatter={(value: any) => {
                if (metric === 'cost' || metric === 'cpc' || metric === 'cpv') {
                  return [`¥${value.toLocaleString()}`, metricLabels[metric]];
                } else if (metric === 'views') {
                  return [`${value.toLocaleString()}回`, metricLabels[metric]];
                }
                return [value, metricLabels[metric]];
              }}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.name === label);
                return item ? item.name : label;
              }}
            />
            <Legend />
            <Bar 
              dataKey={metric} 
              fill={metricColors[metric]} 
              name={metricLabels[metric]}
              onClick={(data) => {
                // YouTubeリンクを開く
                if (data && data.youtubeId) {
                  window.open(`https://www.youtube.com/watch?v=${data.youtubeId}`, '_blank');
                }
              }}
              style={{ cursor: 'pointer' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-right">
        * グラフのバーをクリックすると動画ページが開きます
      </div>
    </div>
  );
}