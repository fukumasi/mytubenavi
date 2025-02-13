import { useState, useEffect } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

interface PromotionStats {
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
}

interface PromotionUpdate {
  impressions?: number;
  clicks?: number;
  revenue?: number;
}

interface ChartData {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

type TimeRange = 'week' | 'month' | 'year';

const calculateDateRange = (timeRange: TimeRange): { startDate: Date; endDate: Date } => {
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

  return { startDate, endDate };
};

export function usePromotionStats(timeRange: TimeRange = 'week') {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    const fetchStats = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { startDate, endDate } = calculateDateRange(timeRange);
        const data = await getPromotionStats(currentUser.id, startDate, endDate);

        const aggregatedStats = data.reduce(
          (acc, item) => ({
            impressions: acc.impressions + (item.impressions || 0),
            clicks: acc.clicks + (item.clicks || 0),
            revenue: acc.revenue + (item.revenue || 0),
          }),
          { impressions: 0, clicks: 0, revenue: 0 }
        );

        setStats({
          ...aggregatedStats,
          ctr: aggregatedStats.impressions > 0
            ? (aggregatedStats.clicks / aggregatedStats.impressions) * 100
            : 0,
        });

        setChartData(
          data.map(item => ({
            date: item.date,
            impressions: item.impressions || 0,
            clicks: item.clicks || 0,
            ctr: item.impressions > 0
              ? (item.clicks / item.impressions) * 100
              : 0,
          }))
        );

        subscription = supabase
          .channel(`promotion_stats:${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'promotion_stats',
              filter: `user_id=eq.${currentUser.id}`
            },
            handleRealtimeUpdate
          )
          .subscribe();

      } catch (err) {
        console.error('Error fetching promotion stats:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    const handleRealtimeUpdate = (payload: RealtimePostgresChangesPayload<any>) => {
      const update = payload.new as PromotionUpdate;

      setStats(prevStats => {
        if (!prevStats) return prevStats;

        const newImpressions = prevStats.impressions + (update.impressions || 0);
        const newClicks = prevStats.clicks + (update.clicks || 0);

        return {
          impressions: newImpressions,
          clicks: newClicks,
          ctr: newImpressions > 0 ? (newClicks / newImpressions) * 100 : 0,
          revenue: prevStats.revenue + (update.revenue || 0),
        };
      });

      setChartData(prevData => {
        const today = new Date().toISOString().split('T')[0];
        const existingIndex = prevData.findIndex(item => item.date === today);

        if (existingIndex === -1) return prevData;

        const updatedData = [...prevData];
        const targetItem = updatedData[existingIndex];
        const newImpressions = targetItem.impressions + (update.impressions || 0);
        const newClicks = targetItem.clicks + (update.clicks || 0);

        updatedData[existingIndex] = {
          ...targetItem,
          impressions: newImpressions,
          clicks: newClicks,
          ctr: newImpressions > 0 ? (newClicks / newImpressions) * 100 : 0,
        };

        return updatedData;
      });
    };

    fetchStats();

    return () => {
      subscription?.unsubscribe();
    };
  }, [currentUser, timeRange]);

  return { stats, chartData, loading, error };
}

export async function getPromotionStats(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const { data, error } = await supabase
    .from('promotion_stats')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data || [];
}