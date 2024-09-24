// src\client\components\AdDashboard.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaAd, FaEye, FaMousePointer, FaChartLine } from 'react-icons/fa';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const DashboardContainer = styled.div`
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 18px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
`;

const StatItem = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatTitle = styled.h3`
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const StatValue = styled.p`
  font-size: 24px;
  font-weight: bold;
  margin: 0;
`;

const ErrorMessage = styled.p`
  color: red;
  text-align: center;
`;

const LoadingMessage = styled.p`
  text-align: center;
  color: #6c757d;
`;

const AdDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          throw new Error('ユーザーが認証されていません。');
        }

        const db = getFirestore();
        const adsRef = collection(db, 'ads');
        const userAdsQuery = query(adsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(userAdsQuery);

        let totalAds = 0;
        let activeAds = 0;
        let totalViews = 0;
        let totalClicks = 0;

        querySnapshot.forEach((doc) => {
          const adData = doc.data();
          totalAds++;
          if (adData.active) activeAds++;
          totalViews += adData.views || 0;
          totalClicks += adData.clicks || 0;
        });

        setStats({ totalAds, activeAds, totalViews, totalClicks });
        setError(null);
      } catch (err) {
        console.error('Error fetching ad stats:', err);
        setError('広告統計の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <LoadingMessage>統計情報を読み込んでいます...</LoadingMessage>;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!stats) {
    return null;
  }

  return (
    <DashboardContainer>
      <Title><FaChartLine /> 広告パフォーマンス概要</Title>
      <StatGrid>
        <StatItem>
          <StatTitle><FaAd /> 総広告数</StatTitle>
          <StatValue>{stats.totalAds}</StatValue>
        </StatItem>
        <StatItem>
          <StatTitle><FaAd /> アクティブな広告</StatTitle>
          <StatValue>{stats.activeAds}</StatValue>
        </StatItem>
        <StatItem>
          <StatTitle><FaEye /> 総表示回数</StatTitle>
          <StatValue>{stats.totalViews.toLocaleString()}</StatValue>
        </StatItem>
        <StatItem>
          <StatTitle><FaMousePointer /> 総クリック数</StatTitle>
          <StatValue>{stats.totalClicks.toLocaleString()}</StatValue>
        </StatItem>
      </StatGrid>
    </DashboardContainer>
  );
};

export default AdDashboard;