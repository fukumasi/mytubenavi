import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PremiumUpgrade from '../components/premium/PremiumUpgrade';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const PremiumUpgradePage: React.FC = () => {
  const { isPremium } = useAuth();
  const navigate = useNavigate();

  // プレミアム会員の場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (isPremium) {
      navigate('/premium/dashboard');
    }
  }, [isPremium, navigate]);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gray-50 dark:bg-dark-bg pt-6 pb-12">
        <div className="container mx-auto px-4">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden">
            <PremiumUpgrade />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default PremiumUpgradePage;