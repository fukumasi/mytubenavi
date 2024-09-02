import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { FaEye, FaMousePointer, FaPercent, FaCalendarAlt } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StatsContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spacing.medium};
  margin-bottom: ${({ theme }) => theme.spacing.large};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const StatsTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.medium};
  margin-bottom: ${({ theme }) => theme.spacing.small};
  color: ${({ theme }) => theme.colors.text};
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.small};
`;

const StatIcon = styled.span`
  margin-right: ${({ theme }) => theme.spacing.small};
  color: ${({ theme }) => theme.colors.primary};
`;

const StatLabel = styled.span`
  font-weight: bold;
  margin-right: ${({ theme }) => theme.spacing.small};
  color: ${({ theme }) => theme.colors.text};
`;

const StatValue = styled.span`
  color: ${({ theme }) => theme.colors.textLight};
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.error};
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 20px auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ChartContainer = styled.div`
  height: 300px;
  margin-top: ${({ theme }) => theme.spacing.large};
`;

const AdStats = ({ adId }) => {
  const [stats, setStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [overallResponse, dailyResponse] = await Promise.all([
          axios.get(`/api/ad-videos/${adId}/stats`),
          axios.get(`/api/ad-videos/${adId}/daily-stats`)
        ]);
        setStats(overallResponse.data.data);
        setDailyStats(dailyResponse.data.data);
      } catch (err) {
        console.error('Error fetching ad stats:', err);
        setError('統計情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [adId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!stats) {
    return null;
  }

  const ctr = stats.viewCount > 0 ? (stats.clickCount / stats.viewCount * 100).toFixed(2) : 0;

  return (
    <StatsContainer>
      <StatsTitle>広告統計</StatsTitle>
      <StatItem>
        <StatIcon><FaEye /></StatIcon>
        <StatLabel>表示回数:</StatLabel>
        <StatValue>{stats.viewCount.toLocaleString()}</StatValue>
      </StatItem>
      <StatItem>
        <StatIcon><FaMousePointer /></StatIcon>
        <StatLabel>クリック数:</StatLabel>
        <StatValue>{stats.clickCount.toLocaleString()}</StatValue>
      </StatItem>
      <StatItem>
        <StatIcon><FaPercent /></StatIcon>
        <StatLabel>クリック率 (CTR):</StatLabel>
        <StatValue>{ctr}%</StatValue>
      </StatItem>
      <StatItem>
        <StatIcon><FaCalendarAlt /></StatIcon>
        <StatLabel>表示期間:</StatLabel>
        <StatValue>
          {new Date(stats.startDate).toLocaleDateString()} - {new Date(stats.endDate).toLocaleDateString()}
        </StatValue>
      </StatItem>
      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={dailyStats}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="viewCount" stroke="#8884d8" name="表示回数" />
            <Line yAxisId="right" type="monotone" dataKey="clickCount" stroke="#82ca9d" name="クリック数" />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </StatsContainer>
  );
};

export default AdStats;

// TODO: 広告のROI（投資収益率）の計算と表示
// TODO: 競合他社の平均パフォーマンスとの比較機能
// TODO: ユーザーセグメント別の統計情報表示
// TODO: 地域別のパフォーマンス分析
// TODO: A/Bテストの結果比較機能
// TODO: 予測分析（将来のパフォーマンス予測）
// TODO: カスタム日付範囲での統計表示
// TODO: エクスポート機能（CSV, PDFなど）
// TODO: リアルタイム統計更新
// TODO: パフォーマンスアラート設定
// TODO: ソーシャルメディア共有統計
// TODO: デバイス別統計情報
// TODO: 広告費用対効果（CPA, CPM）の計算と表示
// TODO: コンバージョン追跡と分析