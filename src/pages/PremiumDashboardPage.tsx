import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PremiumDashboard from '../components/premium/PremiumDashboard';
import ProfileLayout from '../components/profile/ProfileLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const PremiumDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, isPremium } = useAuth();

  useEffect(() => {
    if (!loading && !isPremium) {
      navigate('/premium/upgrade');
    }
  }, [loading, isPremium, navigate]);

  // ローディング中
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // ユーザーがログインしていない場合
  if (!user) {
    navigate('/login');
    return null;
  }

  // プレミアム会員でない場合
  if (!isPremium) {
    navigate('/premium/upgrade');
    return null;
  }

  return (
    <ProfileLayout>
      <PremiumDashboard />
    </ProfileLayout>
  );
};

export default PremiumDashboardPage;