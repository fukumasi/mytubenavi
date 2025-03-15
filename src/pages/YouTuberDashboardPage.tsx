// src/pages/YouTuberDashboardPage.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PromotionDashboard from '../components/youtuber/PromotionDashboard';

const YouTuberDashboardPage: React.FC = () => {
  const { user, youtuberProfile } = useAuth();

  // 認証済みユーザーでかつYouTuber登録がされていない場合は登録ページへリダイレクト
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!youtuberProfile) {
    return <Navigate to="/youtuber/register" replace />;
  }

  return <PromotionDashboard />;
};

export default YouTuberDashboardPage;