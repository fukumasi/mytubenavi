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

  // このコンポーネント自体にはダークモード対応が必要なUI要素はないが、
  // 将来的な拡張に備えてdark:クラスを追加できるようにする
  return (
    <div className="dark:bg-dark-bg">
      <PromotionDashboard />
    </div>
  );
};

export default YouTuberDashboardPage;