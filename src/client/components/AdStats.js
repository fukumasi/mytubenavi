// src\client\components\AdStats.js
import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { FaEye, FaMousePointer, FaPercent, FaCalendarAlt, FaDollarSign } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Styled components remain unchanged...

const AdStats = ({ adId }) => {
  const [stats, setStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const adRef = doc(db, 'ads', adId);
        const adDoc = await getDoc(adRef);

        if (adDoc.exists()) {
          setStats(adDoc.data());
        } else {
          throw new Error('Ad not found');
        }

        const dailyStatsRef = collection(db, 'adDailyStats');
        const dailyStatsQuery = query(dailyStatsRef, where('adId', '==', adId));
        const dailyStatsSnapshot = await getDocs(dailyStatsQuery);
        const dailyStatsData = dailyStatsSnapshot.docs.map(doc => ({
          ...doc.data(),
          date: doc.data().date.toDate().toISOString().split('T')[0]
        }));
        setDailyStats(dailyStatsData);
      } catch (err) {
        console.error('Error fetching ad stats:', err);
        setError('統計情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [adId]);

  const { ctr, roi } = useMemo(() => {
    if (!stats) return { ctr: 0, roi: 0 };
    const ctr = stats.viewCount > 0 ? (stats.clickCount / stats.viewCount * 100).toFixed(2) : 0;
    const roi = stats.cost > 0 ? ((stats.revenue - stats.cost) / stats.cost * 100).toFixed(2) : 0;
    return { ctr, roi };
  }, [stats]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!stats) {
    return null;
  }

  return (
    <StatsContainer>
      <h2>広告統計</h2>
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
        <StatIcon><FaDollarSign /></StatIcon>
        <StatLabel>投資収益率 (ROI):</StatLabel>
        <StatValue>{roi}%</StatValue>
      </StatItem>
      <StatItem>
        <StatIcon><FaCalendarAlt /></StatIcon>
        <StatLabel>表示期間:</StatLabel>
        <StatValue>
          {new Date(stats.startDate.toDate()).toLocaleDateString()} - {new Date(stats.endDate.toDate()).toLocaleDateString()}
        </StatValue>
      </StatItem>
      <ChartContainer>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="views" stroke="#8884d8" name="表示回数" />
            <Line type="monotone" dataKey="clicks" stroke="#82ca9d" name="クリック数" />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </StatsContainer>
  );
};

export default React.memo(AdStats);