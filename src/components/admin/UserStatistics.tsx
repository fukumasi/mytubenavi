// src/components/admin/UserStatistics.tsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area
} from 'recharts';
import { AdminContext } from '../../pages/AdminDashboardPage';

// 色の定義
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const ROLE_COLORS: Record<string, string> = {
  user: '#0088FE',
  youtuber: '#00C49F',
  admin: '#FFBB28',
  premium: '#FF8042',
};

// ユーザー統計情報の型定義
type UserStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  premiumUsers: number;
  roleDistribution: { name: string; value: number }[];
  registrationByDay: { date: string; count: number }[];
  registrationByMonth: { month: string; count: number }[];
  activeByDay: { date: string; active: number; inactive: number }[];
  activePremiumByDay: { date: string; premium: number; regular: number }[];
  userRetention: { date: string; retention: number }[];
  // 新しい統計データ
  userGrowthRate: { date: string; rate: number }[];
  premiumConversionRate: { date: string; rate: number }[];
};

type RoleDistItem = {
  role: string;
  count: number;
};

// 統計情報を日別/月別に切り替えるための列挙型
enum TimeFrame {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
}

// 表示する統計グラフを選択するための列挙型
enum StatType {
  REGISTRATION = 'registration',
  ROLE_DISTRIBUTION = 'roleDistribution',
  ACTIVE_STATUS = 'activeStatus',
  PREMIUM_DISTRIBUTION = 'premiumDistribution',
  USER_RETENTION = 'userRetention',
  GROWTH_RATE = 'growthRate',
  PREMIUM_CONVERSION = 'premiumConversion',
}

// Realtime変更を監視するチャンネル名
const PROFILE_CHANGES_CHANNEL = 'user-stats-profiles-changes';

const UserStatistics: React.FC = () => {
  // AdminContextを使用してグローバルな更新関数を取得
  const { refreshData, lastUpdate } = useContext(AdminContext);
  
  // 日付範囲のstate
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // 統計データのstate
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 表示設定のstate
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(TimeFrame.DAILY);
  const [selectedStats, setSelectedStats] = useState<StatType[]>([
    StatType.REGISTRATION,
    StatType.ROLE_DISTRIBUTION,
    StatType.ACTIVE_STATUS,
    StatType.PREMIUM_DISTRIBUTION
  ]);
  const [filterRole, setFilterRole] = useState<string>('all');
  
  // データ取得の状態管理
  const [isDataFetched, setIsDataFetched] = useState<boolean>(false);
  
  // 強制更新のための内部状態
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  // マウント・アンマウント時のリアルタイム購読設定
  useEffect(() => {
    console.log('UserStatistics: リアルタイム監視を設定します...');
    
    // profiles テーブルの変更を監視するサブスクリプションを設定
    const profilesSubscription = supabase
      .channel(PROFILE_CHANGES_CHANNEL)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        // プロファイル変更時に統計を再取得
        console.log('UserStatistics: Profiles table changed:', payload);
        setRefreshCounter(prev => prev + 1);
      })
      .subscribe();

    // コンポーネントがマウントされたときに初期データを取得
    if (!isDataFetched) {
      fetchUserStats();
      setIsDataFetched(true);
    }

    // クリーンアップ関数でサブスクリプションを解除
    return () => {
      console.log('UserStatistics: リアルタイム監視を解除します...');
      supabase.removeChannel(profilesSubscription);
    };
  }, [isDataFetched]); // isDataFetchedが変更されたときのみ実行
  
  // AdminContextのlastUpdateが変更されたときにデータを再取得
  useEffect(() => {
    if (lastUpdate) {
      console.log('UserStatistics: 上位コンポーネントからの更新通知を受信しました');
      fetchUserStats();
    }
  }, [lastUpdate]);
  
  // 日付範囲変更時またはrefreshCounter変更時に統計を再取得
  useEffect(() => {
    if (isDataFetched) {
      fetchUserStats();
    }
  }, [startDate, endDate, refreshCounter, filterRole]);
  
  // 日付範囲の妥当性を検証
  const validateDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    const minDate = new Date(2023, 0, 1); // サービス開始日を想定
    
    if (start > end) {
      setError('開始日は終了日より前の日付である必要があります');
      return false;
    }
    
    if (end > now) {
      setError('終了日は現在の日付より前である必要があります');
      return false;
    }
    
    if (start < minDate) {
      setError('開始日は2023年1月1日以降である必要があります');
      return false;
    }
    
    return true;
  };
  
  // 統計データ取得関数
  const fetchUserStats = async () => {
    if (!validateDateRange()) {
      return;
    }
    
    console.log('UserStatistics: 統計データを取得します...');
    setLoading(true);
    setError(null);
    
    try {
      // キャッシュ回避用のタイムスタンプ
      const timestamp = new Date().getTime();
      console.log(`UserStatistics: データ取得開始 (${timestamp})`);
      
      // 1. 全ユーザー数の取得
      const { data: totalUsersData, error: totalUsersError } = await supabase
        .from('profiles')
        .select('count', { head: false, count: 'exact' })
        .eq(filterRole !== 'all' ? 'role' : 'id', filterRole !== 'all' ? filterRole : 'id');
      
      if (totalUsersError) throw totalUsersError;
      
      // 2. アクティブユーザー数の取得
      const { data: activeUsersData, error: activeUsersError } = await supabase
        .from('profiles')
        .select('count', { head: false, count: 'exact' })
        .eq('active', true)
        .eq(filterRole !== 'all' ? 'role' : 'id', filterRole !== 'all' ? filterRole : 'id');
      
      if (activeUsersError) throw activeUsersError;
      
      // 3. プレミアムユーザー数の取得
      const { data: premiumUsersData, error: premiumUsersError } = await supabase
        .from('profiles')
        .select('id', { head: false, count: 'exact' })
        .eq('is_premium', true)
        .eq(filterRole !== 'all' ? 'role' : 'id', filterRole !== 'all' ? filterRole : 'id')
        .order('id', { ascending: true });
      
      if (premiumUsersError) throw premiumUsersError;
      
      const premiumCount = premiumUsersData?.length || 0;
      
      // 4. ロール別分布の取得
      let roleDistData: RoleDistItem[] = [];
      
      // 直接クエリで各ロールのカウントを取得
      const roleQuery = supabase
        .from('profiles')
        .select('role, id, is_premium')
        .order('id', { ascending: true });
        
      if (filterRole !== 'all') {
        roleQuery.eq('role', filterRole);
      }
      
      const { data: roleCountsData, error: roleCountsError } = await roleQuery;
      
      if (roleCountsError) throw roleCountsError;
      
      // 手動集計
      const roleCounts: Record<string, number> = {};
      roleCountsData?.forEach(user => {
        const role = user.role || 'unknown';
        // プレミアムユーザーの場合はUIに合わせて「premium」として表示
        const displayRole = (role === 'user' && user.is_premium) ? 'premium' : role;
        roleCounts[displayRole] = (roleCounts[displayRole] || 0) + 1;
      });
      
      // 配列形式に変換
      roleDistData = Object.entries(roleCounts).map(([role, count]) => ({
        role,
        count
      }));
      
      // 5. 期間内の登録ユーザーデータ取得（日別）
      const registrationQuery = supabase
        .from('profiles')
        .select('created_at, id, role, is_premium')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: true });
        
      if (filterRole !== 'all') {
        registrationQuery.eq('role', filterRole);
      }
      
      const { data: registrationData, error: registrationError } = await registrationQuery;
      
      if (registrationError) throw registrationError;
      
      // データの整形（日別登録数）
      const dayMap = new Map<string, number>();
      const premiumDayMap = new Map<string, { premium: number; regular: number }>();
      const cumulativeUsersByDay = new Map<string, number>();
      const userGrowthRateMap = new Map<string, number>();
      const premiumConversionRateMap = new Map<string, number>();
      let cumulativeUsers = 0;
      let previousDayUsers = 0;
      
      // 統計期間の全日付を生成（データがない日もグラフに表示するため）
      const dateRange: string[] = [];
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dateRange.push(dateStr);
        dayMap.set(dateStr, 0);
        premiumDayMap.set(dateStr, { premium: 0, regular: 0 });
      }
      
      // 登録データを日付ごとに集計
      registrationData?.forEach(user => {
        const date = new Date(user.created_at).toISOString().split('T')[0];
        
        // 日別登録数
        dayMap.set(date, (dayMap.get(date) || 0) + 1);
        
        // プレミアム/通常ユーザー別の集計
        const isPremium = user.is_premium || (user.role === 'user' && user.is_premium);
        const userCounts = premiumDayMap.get(date) || { premium: 0, regular: 0 };
        
        if (isPremium) {
          userCounts.premium += 1;
        } else {
          userCounts.regular += 1;
        }
        
        premiumDayMap.set(date, userCounts);
      });
      
      // 累積ユーザー数と成長率の計算
      dateRange.sort().forEach(date => {
        const dailyNewUsers = dayMap.get(date) || 0;
        cumulativeUsers += dailyNewUsers;
        cumulativeUsersByDay.set(date, cumulativeUsers);
        
        // 成長率の計算 (前日比)
        if (previousDayUsers > 0) {
          const growthRate = ((cumulativeUsers - previousDayUsers) / previousDayUsers) * 100;
          userGrowthRateMap.set(date, growthRate);
        } else {
          userGrowthRateMap.set(date, 0);
        }
        
        previousDayUsers = cumulativeUsers;
        
        // プレミアム変換率の計算
        const dayData = premiumDayMap.get(date) || { premium: 0, regular: 0 };
        const totalDayUsers = dayData.premium + dayData.regular;
        const conversionRate = totalDayUsers > 0 ? (dayData.premium / totalDayUsers) * 100 : 0;
        premiumConversionRateMap.set(date, conversionRate);
      });
      
      // 日別登録数の配列形式への変換
      const registrationByDay = Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // ユーザー保持率（仮の実装 - 実際にはより詳細な分析が必要）
      const retentionRate = new Map<string, number>();
      const now = new Date();
      
      // 単純化したユーザー保持率の計算（例として、登録後30日経過したユーザーがまだアクティブかどうか）
      registrationData?.forEach(user => {
        const registerDate = new Date(user.created_at).toISOString().split('T')[0];
        const daysSinceRegistration = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
        
        // 仮の保持率計算（実際のプロジェクトではより複雑な計算が必要）
        if (daysSinceRegistration >= 30) {
          retentionRate.set(registerDate, Math.random() * 100); // 仮のデータ
        }
      });
      
      // データの整形（月別登録数）
      const monthMap = new Map<string, number>();
      registrationData?.forEach(user => {
        const date = new Date(user.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      });
      
      const registrationByMonth = Array.from(monthMap.entries())
        .map(([month, count]) => ({
          month,
          count,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
      
      // アクティブ/無効ユーザー別の日次データ
      const activeByDay = Array.from(premiumDayMap.entries())
        .map(([date, { premium, regular }]) => ({
          date,
          active: premium + regular, // 簡略化のため、すべての新規ユーザーをアクティブと仮定
          inactive: 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // プレミアム/通常ユーザー別の日次データ
      const activePremiumByDay = Array.from(premiumDayMap.entries())
        .map(([date, { premium, regular }]) => ({
          date,
          premium,
          regular
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // ユーザー成長率データ
      const userGrowthRate = Array.from(userGrowthRateMap.entries())
        .map(([date, rate]) => ({
          date,
          rate: Number(rate.toFixed(2))
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // プレミアム変換率データ
      const premiumConversionRate = Array.from(premiumConversionRateMap.entries())
        .map(([date, rate]) => ({
          date,
          rate: Number(rate.toFixed(2))
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // ユーザー保持率データ
      const userRetention = Array.from(retentionRate.entries())
        .map(([date, retention]) => ({
          date,
          retention: Number(retention.toFixed(2))
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // ロール別分布の整形
      const roleDistribution = roleDistData.map((item: RoleDistItem) => ({
        name: item.role,
        value: item.count,
      }));
      
      // 統計情報の設定
      setStats({
        totalUsers: totalUsersData?.[0]?.count || 0,
        activeUsers: activeUsersData?.[0]?.count || 0,
        inactiveUsers: (totalUsersData?.[0]?.count || 0) - (activeUsersData?.[0]?.count || 0),
        premiumUsers: premiumCount,
        roleDistribution,
        registrationByDay,
        registrationByMonth,
        activeByDay,
        activePremiumByDay,
        userRetention,
        userGrowthRate,
        premiumConversionRate
      });
      
      console.log(`UserStatistics: 統計更新完了 - プレミアムユーザー: ${premiumCount}人, 
                   全ユーザー: ${totalUsersData?.[0]?.count || 0}人, 
                   アクティブユーザー: ${activeUsersData?.[0]?.count || 0}人, 
                   ロール分布: `, roleDistribution);
    } catch (err) {
      const error = err as Error;
      setError(`データの取得に失敗しました: ${error.message}`);
      console.error('UserStatistics: 統計取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // 手動更新ハンドラー
  const handleManualRefresh = () => {
    console.log('UserStatistics: 手動更新が要求されました');
    setRefreshCounter(prev => prev + 1);
    // グローバルな更新関数も呼び出し
    refreshData();
  };
  
  // 統計グラフの表示/非表示を切り替えるハンドラー
  const toggleStatDisplay = (statType: StatType) => {
    if (selectedStats.includes(statType)) {
      setSelectedStats(selectedStats.filter(type => type !== statType));
    } else {
      setSelectedStats([...selectedStats, statType]);
    }
  };
  
  // カスタムTooltipコンポーネント
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white shadow-lg rounded-md p-2 border border-gray-200">
          <p className="font-bold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // 日付の表示形式変換
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ja-JP', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
};

// 月の表示形式変換
const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  return `${year}年${month}月`;
};

// 表示データを期間単位（日/週/月）でグループ化
const groupDataByTimeFrame = useMemo(() => {
  // 以下省略
    if (!stats) return null;
    
    switch (timeFrame) {
      case TimeFrame.DAILY:
        // 日次データはそのまま返す
        return {
          registrationData: stats.registrationByDay,
          activeStatusData: stats.activeByDay,
          premiumDistData: stats.activePremiumByDay,
          retentionData: stats.userRetention,
          growthRateData: stats.userGrowthRate,
          conversionRateData: stats.premiumConversionRate
        };
        
      case TimeFrame.WEEKLY:
        // 週次データにグループ化
        const weeklyRegistration = new Map<string, number>();
        const weeklyActiveStatus = new Map<string, { active: number, inactive: number }>();
        const weeklyPremiumDist = new Map<string, { premium: number, regular: number }>();
        const weeklyRetention = new Map<string, number>();
        const weeklyGrowthRate = new Map<string, number>();
        const weeklyConversionRate = new Map<string, number>();
        
        // 日付から週の識別子を生成する関数
        const getWeekIdentifier = (dateStr: string) => {
          const date = new Date(dateStr);
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const weekNumber = Math.ceil(
            ((date.getTime() - firstDayOfYear.getTime()) / 86400000 + firstDayOfYear.getDay() + 1) / 7
          );
          return `${date.getFullYear()}-W${weekNumber}`;
        };
        
        // 登録データの週次集計
        stats.registrationByDay.forEach(item => {
          const weekId = getWeekIdentifier(item.date);
          weeklyRegistration.set(weekId, (weeklyRegistration.get(weekId) || 0) + item.count);
        });
        
        // アクティブ状態の週次集計
        stats.activeByDay.forEach(item => {
          const weekId = getWeekIdentifier(item.date);
          const current = weeklyActiveStatus.get(weekId) || { active: 0, inactive: 0 };
          current.active += item.active;
          current.inactive += item.inactive;
          weeklyActiveStatus.set(weekId, current);
        });
        
        // プレミアム分布の週次集計
        stats.activePremiumByDay.forEach(item => {
          const weekId = getWeekIdentifier(item.date);
          const current = weeklyPremiumDist.get(weekId) || { premium: 0, regular: 0 };
          current.premium += item.premium;
          current.regular += item.regular;
          weeklyPremiumDist.set(weekId, current);
        });
        
        // 保持率の週次集計（平均値を使用）
        const weeklyRetentionCounts = new Map<string, { sum: number, count: number }>();
        stats.userRetention.forEach(item => {
          const weekId = getWeekIdentifier(item.date);
          const current = weeklyRetentionCounts.get(weekId) || { sum: 0, count: 0 };
          current.sum += item.retention;
          current.count += 1;
          weeklyRetentionCounts.set(weekId, current);
        });
        
        weeklyRetentionCounts.forEach((value, weekId) => {
          weeklyRetention.set(weekId, value.sum / value.count);
        });
        
        // 成長率の週次集計（平均値を使用）
        const weeklyGrowthCounts = new Map<string, { sum: number, count: number }>();
        stats.userGrowthRate.forEach(item => {
          const weekId = getWeekIdentifier(item.date);
          const current = weeklyGrowthCounts.get(weekId) || { sum: 0, count: 0 };
          current.sum += item.rate;
          current.count += 1;
          weeklyGrowthCounts.set(weekId, current);
        });
        
        weeklyGrowthCounts.forEach((value, weekId) => {
          weeklyGrowthRate.set(weekId, value.sum / value.count);
        });
        
        // 変換率の週次集計（平均値を使用）
        const weeklyConversionCounts = new Map<string, { sum: number, count: number }>();
        stats.premiumConversionRate.forEach(item => {
          const weekId = getWeekIdentifier(item.date);
          const current = weeklyConversionCounts.get(weekId) || { sum: 0, count: 0 };
          current.sum += item.rate;
          current.count += 1;
          weeklyConversionCounts.set(weekId, current);
        });
        
        weeklyConversionCounts.forEach((value, weekId) => {
          weeklyConversionRate.set(weekId, value.sum / value.count);
        });
        
        // 週次データを配列に変換
        return {
          registrationData: Array.from(weeklyRegistration.entries())
            .map(([weekId, count]) => ({ date: weekId, count }))
            .sort((a, b) => a.date.localeCompare(b.date)),
            
          activeStatusData: Array.from(weeklyActiveStatus.entries())
            .map(([weekId, { active, inactive }]) => ({ date: weekId, active, inactive }))
            .sort((a, b) => a.date.localeCompare(b.date)),
            
          premiumDistData: Array.from(weeklyPremiumDist.entries())
            .map(([weekId, { premium, regular }]) => ({ date: weekId, premium, regular }))
            .sort((a, b) => a.date.localeCompare(b.date)),
            
          retentionData: Array.from(weeklyRetention.entries())
            .map(([weekId, retention]) => ({ date: weekId, retention: Number(retention.toFixed(2)) }))
            .sort((a, b) => a.date.localeCompare(b.date)),
            
          growthRateData: Array.from(weeklyGrowthRate.entries())
            .map(([weekId, rate]) => ({ date: weekId, rate: Number(rate.toFixed(2)) }))
            .sort((a, b) => a.date.localeCompare(b.date)),
            
          conversionRateData: Array.from(weeklyConversionRate.entries())
            .map(([weekId, rate]) => ({ date: weekId, rate: Number(rate.toFixed(2)) }))
            .sort((a, b) => a.date.localeCompare(b.date))
        };
        
      case TimeFrame.MONTHLY:
        // 月次データはそのまま返す（registrationByMonthを使用）
        // 他のデータは日付から月を抽出してグループ化
        const monthlyActiveStatus = new Map<string, { active: number, inactive: number }>();
        const monthlyPremiumDist = new Map<string, { premium: number, regular: number }>();
        const monthlyRetention = new Map<string, number>();
        const monthlyGrowthRate = new Map<string, number>();
        const monthlyConversionRate = new Map<string, number>();
        
        // 日付から月の識別子を生成する関数
        const getMonthIdentifier = (dateStr: string) => {
          const date = new Date(dateStr);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        };
        
        // アクティブ状態の月次集計
        stats.activeByDay.forEach(item => {
          const monthId = getMonthIdentifier(item.date);
          const current = monthlyActiveStatus.get(monthId) || { active: 0, inactive: 0 };
          current.active += item.active;
          current.inactive += item.inactive;
          monthlyActiveStatus.set(monthId, current);
        });
        
        // プレミアム分布の月次集計
        stats.activePremiumByDay.forEach(item => {
          const monthId = getMonthIdentifier(item.date);
          const current = monthlyPremiumDist.get(monthId) || { premium: 0, regular: 0 };
          current.premium += item.premium;current.regular += item.regular;
          monthlyPremiumDist.set(monthId, current);
        });
        
        // 保持率の月次集計（平均値を使用）
        const monthlyRetentionCounts = new Map<string, { sum: number, count: number }>();
        stats.userRetention.forEach(item => {
          const monthId = getMonthIdentifier(item.date);
          const current = monthlyRetentionCounts.get(monthId) || { sum: 0, count: 0 };
          current.sum += item.retention;
          current.count += 1;
          monthlyRetentionCounts.set(monthId, current);
        });
        
        monthlyRetentionCounts.forEach((value, monthId) => {
          monthlyRetention.set(monthId, value.sum / value.count);
        });
        
        // 成長率の月次集計（平均値を使用）
        const monthlyGrowthCounts = new Map<string, { sum: number, count: number }>();
        stats.userGrowthRate.forEach(item => {
          const monthId = getMonthIdentifier(item.date);
          const current = monthlyGrowthCounts.get(monthId) || { sum: 0, count: 0 };
          current.sum += item.rate;
          current.count += 1;
          monthlyGrowthCounts.set(monthId, current);
        });
        
        monthlyGrowthCounts.forEach((value, monthId) => {
          monthlyGrowthRate.set(monthId, value.sum / value.count);
        });
        
        // 変換率の月次集計（平均値を使用）
        const monthlyConversionCounts = new Map<string, { sum: number, count: number }>();
        stats.premiumConversionRate.forEach(item => {
          const monthId = getMonthIdentifier(item.date);
          const current = monthlyConversionCounts.get(monthId) || { sum: 0, count: 0 };
          current.sum += item.rate;
          current.count += 1;
          monthlyConversionCounts.set(monthId, current);
        });
        
        monthlyConversionCounts.forEach((value, monthId) => {
          monthlyConversionRate.set(monthId, value.sum / value.count);
        });
        
        // 月次データを配列に変換
        return {
          registrationData: stats.registrationByMonth.map(item => ({ 
            date: item.month, 
            count: item.count 
          })),
          
          activeStatusData: Array.from(monthlyActiveStatus.entries())
            .map(([monthId, { active, inactive }]) => ({ date: monthId, active, inactive }))
            .sort((a, b) => a.date.localeCompare(b.date)),
            
          premiumDistData: Array.from(monthlyPremiumDist.entries())
            .map(([monthId, { premium, regular }]) => ({ date: monthId, premium, regular }))
            .sort((a, b) => a.date.localeCompare(b.date)),
            
          retentionData: Array.from(monthlyRetention.entries())
            .map(([monthId, retention]) => ({ date: monthId, retention: Number(retention.toFixed(2)) }))
            .sort((a, b) => a.date.localeCompare(b.date)),
            
          growthRateData: Array.from(monthlyGrowthRate.entries())
            .map(([monthId, rate]) => ({ date: monthId, rate: Number(rate.toFixed(2)) }))
            .sort((a, b) => a.date.localeCompare(b.date)),
            
          conversionRateData: Array.from(monthlyConversionRate.entries())
            .map(([monthId, rate]) => ({ date: monthId, rate: Number(rate.toFixed(2)) }))
            .sort((a, b) => a.date.localeCompare(b.date))
        };
    }
  }, [stats, timeFrame]);
  
  // 期間表示の整形関数
  const formatTimeFrame = (dateStr: string) => {
    switch (timeFrame) {
      case TimeFrame.DAILY:
        return formatDate(dateStr);
      case TimeFrame.WEEKLY:
        // 週の表示形式（例: 2023-W1 -> 2023年第1週）
        if (dateStr.includes('-W')) {
          const [year, week] = dateStr.split('-W');
          return `${year}年第${week}週`;
        }
        return dateStr;
      case TimeFrame.MONTHLY:
        return formatMonth(dateStr);
      default:
        return dateStr;
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">ユーザー統計</h2>
        <button
          onClick={handleManualRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          最新データに更新
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* 日付範囲選択 */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">期間の開始</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-md p-2"
            max={endDate}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">期間の終了</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-md p-2"
            min={startDate}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ロール</label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border rounded-md p-2"
          >
            <option value="all">すべて</option>
            <option value="user">一般ユーザー</option>
            <option value="youtuber">YouTuber</option>
            <option value="admin">管理者</option>
          </select>
        </div>
        
        <div className="ml-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">時間単位</label>
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
            className="border rounded-md p-2"
          >
            <option value={TimeFrame.DAILY}>日別</option>
            <option value={TimeFrame.WEEKLY}>週別</option>
            <option value={TimeFrame.MONTHLY}>月別</option>
          </select>
        </div>
      </div>
      
      {/* グラフ選択チェックボックス */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="text-sm font-medium text-gray-700 mr-2">表示する統計:</div>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={selectedStats.includes(StatType.REGISTRATION)}
            onChange={() => toggleStatDisplay(StatType.REGISTRATION)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="ml-2">ユーザー登録推移</span>
        </label>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={selectedStats.includes(StatType.ROLE_DISTRIBUTION)}
            onChange={() => toggleStatDisplay(StatType.ROLE_DISTRIBUTION)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="ml-2">ユーザー種別分布</span>
        </label>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={selectedStats.includes(StatType.ACTIVE_STATUS)}
            onChange={() => toggleStatDisplay(StatType.ACTIVE_STATUS)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="ml-2">アクティブ状態別推移</span>
        </label>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={selectedStats.includes(StatType.PREMIUM_DISTRIBUTION)}
            onChange={() => toggleStatDisplay(StatType.PREMIUM_DISTRIBUTION)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="ml-2">プレミアムユーザー分布</span>
        </label>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={selectedStats.includes(StatType.USER_RETENTION)}
            onChange={() => toggleStatDisplay(StatType.USER_RETENTION)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="ml-2">ユーザー保持率</span>
        </label>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={selectedStats.includes(StatType.GROWTH_RATE)}
            onChange={() => toggleStatDisplay(StatType.GROWTH_RATE)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="ml-2">ユーザー成長率</span>
        </label>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={selectedStats.includes(StatType.PREMIUM_CONVERSION)}
            onChange={() => toggleStatDisplay(StatType.PREMIUM_CONVERSION)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="ml-2">プレミアム変換率</span>
        </label>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : stats ? (
        <div>
          {/* 概要カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-blue-700">総ユーザー数</h3>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-green-700">アクティブユーザー</h3>
              <p className="text-3xl font-bold">{stats.activeUsers}</p>
              <p className="text-sm text-green-600">
                {stats.totalUsers > 0 
                  ? `${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%` 
                  : '0%'}
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-red-700">無効ユーザー</h3>
              <p className="text-3xl font-bold">{stats.inactiveUsers}</p>
              <p className="text-sm text-red-600">
                {stats.totalUsers > 0 
                  ? `${((stats.inactiveUsers / stats.totalUsers) * 100).toFixed(1)}%` 
                  : '0%'}
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-purple-700">プレミアムユーザー</h3>
              <p className="text-3xl font-bold">{stats.premiumUsers}</p>
              <p className="text-sm text-purple-600">
                {stats.totalUsers > 0 
                  ? `${((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)}%` 
                  : '0%'}
              </p>
            </div>
          </div>
          
          {/* グラフセクション */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            {/* 登録ユーザー推移グラフ */}
            {selectedStats.includes(StatType.REGISTRATION) && groupDataByTimeFrame && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">ユーザー登録推移</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={groupDataByTimeFrame.registrationData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatTimeFrame}
                        interval="preserveStartEnd"
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        name="登録ユーザー数" 
                        stroke="#8884d8" 
                        fillOpacity={0.3}
                        fill="#8884d8" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* ロール別分布の円グラフ */}
            {selectedStats.includes(StatType.ROLE_DISTRIBUTION) && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">ユーザー種別分布</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.roleDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        {stats.roleDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={ROLE_COLORS[entry.name as keyof typeof ROLE_COLORS] || COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* アクティブ/無効ユーザー推移グラフ */}
            {selectedStats.includes(StatType.ACTIVE_STATUS) && groupDataByTimeFrame && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">アクティブ状態別ユーザー推移</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={groupDataByTimeFrame.activeStatusData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatTimeFrame}
                        interval="preserveStartEnd"
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="active" name="アクティブユーザー" stackId="a" fill="#82ca9d" />
                      <Bar dataKey="inactive" name="無効ユーザー" stackId="a" fill="#ff8042" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* プレミアム/通常ユーザー分布グラフ */}
            {selectedStats.includes(StatType.PREMIUM_DISTRIBUTION) && groupDataByTimeFrame && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">プレミアム/通常ユーザー分布</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={groupDataByTimeFrame.premiumDistData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatTimeFrame}
                        interval="preserveStartEnd"
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="premium" name="プレミアムユーザー" stackId="a" fill="#8884d8" />
                      <Bar dataKey="regular" name="通常ユーザー" stackId="a" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* ユーザー保持率グラフ */}
            {selectedStats.includes(StatType.USER_RETENTION) && groupDataByTimeFrame && groupDataByTimeFrame.retentionData.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">ユーザー保持率</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={groupDataByTimeFrame.retentionData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatTimeFrame}
                        interval="preserveStartEnd"
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="retention" 
                        name="保持率 (%)" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* ユーザー成長率グラフ */}
            {selectedStats.includes(StatType.GROWTH_RATE) && groupDataByTimeFrame && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">ユーザー成長率</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={groupDataByTimeFrame.growthRateData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatTimeFrame}
                        interval="preserveStartEnd"
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        name="成長率 (%)" 
                        stroke="#82ca9d" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* プレミアム変換率グラフ */}
            {selectedStats.includes(StatType.PREMIUM_CONVERSION) && groupDataByTimeFrame && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">プレミアム変換率</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={groupDataByTimeFrame.conversionRateData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatTimeFrame}
                        interval="preserveStartEnd"
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        name="変換率 (%)" 
                        stroke="#FF8042" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">
          データがありません。日付範囲を調整してみてください。
        </div>
      )}
    </div>
  );
};

export default UserStatistics;