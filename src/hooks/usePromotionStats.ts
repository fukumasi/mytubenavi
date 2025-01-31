import { useState, useEffect } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

export function usePromotionStats(timeRange: 'week' | 'month' | 'year' = 'week') {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    const fetchStats = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError(null);

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

        const data = await getPromotionStats(currentUser.id, startDate, endDate);

        const totalImpressions = data.reduce((sum, item) => sum + (item.impressions || 0), 0);
        const totalClicks = data.reduce((sum, item) => sum + (item.clicks || 0), 0);
        const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);

        setStats({
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: totalClicks && totalImpressions ? (totalClicks / totalImpressions) * 100 : 0,
          revenue: totalRevenue,
        });

        setChartData(
          data.map((item: any) => ({
            date: item.date,
            impressions: item.impressions,
            clicks: item.clicks,
            ctr: item.impressions ? (item.clicks / item.impressions) * 100 : 0,
          }))
        );

        // リアルタイム購読の正しい実装
        subscription = supabase
          .channel(`promotion_stats:user_id=eq.${currentUser.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'promotion_stats' }, (payload: RealtimePostgresChangesPayload<any>) => {
            const update = payload.new as PromotionUpdate;

            setStats((prevStats) => {
              if (!prevStats) return prevStats;
              return {
                ...prevStats,
                impressions: prevStats.impressions + (update.impressions || 0),
                clicks: prevStats.clicks + (update.clicks || 0),
                ctr:
                  prevStats.impressions + (update.impressions || 0) > 0
                    ? ((prevStats.clicks + (update.clicks || 0)) /
                        (prevStats.impressions + (update.impressions || 0))) *
                      100
                    : 0,
                revenue: prevStats.revenue + (update.revenue || 0),
              };
            });

            setChartData((prevData) => {
              const today = new Date().toISOString().split('T')[0];
              const existingIndex = prevData.findIndex((item) => item.date === today);

              if (existingIndex >= 0) {
                const updatedData = [...prevData];
                updatedData[existingIndex] = {
                  ...updatedData[existingIndex],
                  impressions:
                    updatedData[existingIndex].impressions + (update.impressions || 0),
                  clicks: updatedData[existingIndex].clicks + (update.clicks || 0),
                  ctr:
                    (updatedData[existingIndex].clicks + (update.clicks || 0)) /
                    (updatedData[existingIndex].impressions + (update.impressions || 0)) *
                    100,
                };
                return updatedData;
              }

              return prevData;
            });
          })
          .subscribe();
      } catch (err) {
        console.error('Error fetching promotion stats:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [currentUser, timeRange]);

  return { stats, chartData, loading, error };
}

export async function getPromotionStats(userId: string, startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('promotion_stats')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    throw error;
  }

  return data || [];
}
