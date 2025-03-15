// src/pages/PromotionPage.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PromotionSlots from '../components/youtuber/PromotionSlots';
import PromotionDashboard from '../components/youtuber/PromotionDashboard';

const PromotionPage: React.FC = () => {
  const { user, youtuberProfile } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // YouTuberユーザーの場合はダッシュボードを表示
  if (youtuberProfile) {
    return <PromotionDashboard />;
  }

  // 一般ユーザーの場合は掲載枠一覧を表示
  return <PromotionSlots />;
};

export default PromotionPage;