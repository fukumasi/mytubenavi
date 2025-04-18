// src/pages/PremiumDashboardPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PremiumDashboard from '@/components/premium/PremiumDashboard';
import ProfileLayout from '@/components/profile/ProfileLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PremiumExpired from '@/components/premium/PremiumExpired';

// プレミアムユーザー情報の型定義
export type PremiumInfo = {
  plan: string;
  startDate: string;
  expiryDate: string;
  daysLeft: number;
  isExpired: boolean;
  features: string[];
};

const PremiumDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, isPremium } = useAuth();
  const [premiumInfo, setPremiumInfo] = useState<PremiumInfo | null>(null);
  const [premiumLoading, setPremiumLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // プレミアム情報を取得
  useEffect(() => {
    const fetchPremiumInfo = async () => {
      if (!user) return;

      try {
        setPremiumLoading(true);
        setError(null);

        // ユーザープロファイルからプレミアム情報を取得
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('premium_plan, premium_expiry, is_premium')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (!data) {
          throw new Error('プロファイル情報が見つかりません');
        }

        // プレミアム期限が切れているか確認
        const now = new Date();
        const expiryDate = data.premium_expiry ? new Date(data.premium_expiry) : null;
        const isExpired = expiryDate ? expiryDate < now : !data.is_premium;

        // 期限切れの場合、プレミアムステータスを更新
        if (expiryDate && expiryDate < now && data.is_premium) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_premium: false, premium_plan: null })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('プレミアム期限更新エラー:', updateError);
          } else {
            // ユーザー情報の変更を通知（ページのリロードでシンプルに対応）
            window.location.reload();
          }
        }

        // 残り日数を計算
        let daysLeft = 0;
        if (expiryDate && !isExpired) {
          const diffTime = expiryDate.getTime() - now.getTime();
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // プレミアム機能リスト
        const features = [
          'ユーザーマッチング機能（完全版）',
          '動画レコメンド機能',
          '広告非表示',
          'プレミアムバッジ',
          'カスタムテーマ設定'
        ];

        // 開始日はデータがなければ今から30日前と仮定
        const startDate = new Date();
        if (expiryDate) {
          startDate.setTime(expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else {
          startDate.setDate(startDate.getDate() - 30);
        }

        // プレミアム情報をセット
        setPremiumInfo({
          plan: data.premium_plan || 'standard',
          startDate: startDate.toISOString(),
          expiryDate: data.premium_expiry || new Date().toISOString(),
          daysLeft,
          isExpired,
          features
        });

      } catch (err) {
        console.error('プレミアム情報取得エラー:', err);
        setError('プレミアム情報の取得に失敗しました。');
      } finally {
        setPremiumLoading(false);
      }
    };

    if (!loading && user) {
      fetchPremiumInfo();
    }
  }, [user, loading]);

  // ユーザー情報取得中のローディング表示
  if (loading || (user && premiumLoading)) {
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
    return (
      <ProfileLayout>
        {premiumInfo?.isExpired ? (
          <PremiumExpired 
            expiredDate={premiumInfo.expiryDate} 
            redirectUrl="/premium/upgrade"
          />
        ) : (
          <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">プレミアム会員特典</h2>
            <p className="text-lg text-gray-700 mb-6">
              プレミアム会員になると、より多くの特典を利用できます。
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/premium/upgrade')}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                プレミアム会員にアップグレード
              </button>
            </div>
          </div>
        )}
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout>
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => window.location.reload()}
            className="ml-4 underline"
          >
            再読み込み
          </button>
        </div>
      ) : (
        <PremiumDashboard />
      )}
    </ProfileLayout>
  );
};

export default PremiumDashboardPage;