import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PremiumExpired from '@/components/premium/PremiumExpired';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface PremiumGuardProps {
  children: React.ReactNode;
  redirectToUpgrade?: boolean;
}

const PremiumGuard: React.FC<PremiumGuardProps> = ({ 
  children, 
  redirectToUpgrade = true 
}) => {
  const { user, loading, isPremium, premiumStatus, refreshPremiumStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!loading) {
        // まだログインしていない場合は、ログインページにリダイレクト
        if (!user) {
          navigate('/login', { state: { from: location.pathname } });
          return;
        }

        // 明示的にプレミアムステータスを更新
        await refreshPremiumStatus();
        setIsChecking(false);
      }
    };

    checkPremiumStatus();
  }, [user, loading, navigate, location.pathname, refreshPremiumStatus]);

  // ローディング中またはステータスチェック中
  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // ユーザーがログインしていない場合は既にリダイレクトされているのでnullを返す
  if (!user) {
    return null;
  }

  // プレミアム会員ではない場合
  if (!isPremium) {
    // 直接アップグレードページにリダイレクト
    if (redirectToUpgrade) {
      navigate('/premium/upgrade', { state: { from: location.pathname } });
      return null;
    }
    
    // そのまま期限切れ画面を表示
    return <PremiumExpired redirectUrl="/premium/upgrade" />;
  }

  // プレミアム会員だが、ステータスが無効または期限切れの場合
  if (premiumStatus && (!premiumStatus.isActive || premiumStatus.daysRemaining === 0)) {
    return <PremiumExpired expiredDate={premiumStatus.expiresAt || undefined} />;
  }

  // 正常なプレミアム会員の場合は子コンポーネントを表示
  return <>{children}</>;
};

export default PremiumGuard;