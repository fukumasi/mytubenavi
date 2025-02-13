// src/pages/PromotionPage.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PromotionDashboard from '../components/youtuber/PromotionDashboard';

const PromotionPage: React.FC = () => {
 const { currentUser, youtuberProfile } = useAuth();

 if (!currentUser) {
   return <Navigate to="/login" replace />;
 }

 if (!youtuberProfile) {
   return <Navigate to="/youtuber/register" replace />;
 }

 return <PromotionDashboard />;
};

export default PromotionPage;