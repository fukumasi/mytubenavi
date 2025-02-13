// src/pages/YouTuberDashboardPage.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from '../components/youtuber/Dashboard';

const YouTuberDashboardPage: React.FC = () => {
 const { currentUser, youtuberProfile } = useAuth();

 // 認証済みユーザーでかつYouTuber登録がされていない場合は登録ページへリダイレクト
 if (!currentUser) {
   return <Navigate to="/login" replace />;
 }

 if (!youtuberProfile) {
   return <Navigate to="/youtuber/register" replace />;
 }

 return <Dashboard />;
};

export default YouTuberDashboardPage;