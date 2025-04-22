// src/components/premium/PremiumDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PremiumBadge from '../profile/PremiumBadge';
import PremiumFeatures from './PremiumFeatures';
import MatchingSystem from '@/components/matching/MatchingSystem';

interface PremiumStatus {
  plan: string;
  expiry: string;
  isActive: boolean;
  daysRemaining: number;
}

interface UsageStats {
  matchesViewed: number;
  matchesConnected: number;
  savedVideos: number;
  notificationsReceived: number;
}

const PremiumDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMatchingSection, setShowMatchingSection] = useState(false);

  // 成功メッセージの表示（リダイレクト時など）
  useEffect(() => {
    if (location.state && location.state.success) {
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [location.state]);

  // プレミアムステータスと利用統計データの取得
  useEffect(() => {
    const fetchPremiumData = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);

      try {
        // Promise.allを使用して、並列にデータを取得
        const [
          profileResponse,
          matchesViewedResponse,
          matchesConnectedResponse,
          savedVideosResponse,
          notificationsResponse
        ] = await Promise.all([
          // プロフィールからプレミアムステータスを取得
          supabase
            .from('profiles')
            .select('is_premium, premium_plan, premium_expiry')
            .eq('id', user.id)
            .single(),
          
          // マッチング候補表示数の取得（user_matching_scoresの件数）
          supabase
            .from('user_matching_scores')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          
          // 成立したマッチング数の取得（user_matchesの件数）
          supabase
            .from('user_matches')
            .select('id', { count: 'exact', head: true })
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
          
          // 保存した動画数の取得（favoritesの件数）
          supabase
            .from('favorites')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          
          // 受信した通知数の取得（notificationsの件数）
          supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
        ]);
        
        // エラーチェック
        if (profileResponse.error) throw profileResponse.error;
        if (matchesViewedResponse.error) throw matchesViewedResponse.error;
        if (matchesConnectedResponse.error) throw matchesConnectedResponse.error;
        if (savedVideosResponse.error) throw savedVideosResponse.error;
        if (notificationsResponse.error) throw notificationsResponse.error;
        
        // プレミアムステータスの設定
        if (profileResponse.data) {
          const expiryDate = new Date(profileResponse.data.premium_expiry);
          const today = new Date();
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setPremiumStatus({
            plan: profileResponse.data.premium_plan || 'monthly',
            expiry: profileResponse.data.premium_expiry,
            isActive: profileResponse.data.is_premium && diffDays > 0,
            daysRemaining: diffDays
          });
        }

        // 利用統計データの設定
        setUsageStats({
          matchesViewed: matchesViewedResponse.count || 0,
          matchesConnected: matchesConnectedResponse.count || 0,
          savedVideos: savedVideosResponse.count || 0,
          notificationsReceived: notificationsResponse.count || 0
        });
      } catch (err) {
        console.error('プレミアムデータの取得中にエラーが発生しました:', err);
        setError('データの読み込みに失敗しました。もう一度お試しください。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPremiumData();
  }, [user]);

  // プラン名をフォーマットする関数
  const formatPlanName = (plan: string): string => {
    switch (plan) {
      case 'monthly': return '月額プラン';
      case 'quarterly': return '3ヶ月プラン';
      case 'yearly': return '年間プラン';
      default: return plan;
    }
  };

  // 表示用に日付をフォーマットする関数
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 dark:border-blue-400 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg text-red-700 dark:text-red-400 mb-6">
        <p>{error}</p>
        <button 
          className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
          onClick={() => window.location.reload()}
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {showSuccessMessage && location.state?.message && (
        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-green-700 dark:text-green-300 mb-6 flex justify-between items-center">
          <p>{location.state.message}</p>
          <button 
            className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-200"
            onClick={() => setShowSuccessMessage(false)}
          >
            ×
          </button>
        </div>
      )}
      
      <div className="mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center text-gray-900 dark:text-dark-text-primary">
              プレミアムダッシュボード 
              <PremiumBadge size="lg" disableLink className="ml-2" />
            </h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">プレミアム会員特典と利用状況を確認できます</p>
          </div>
          <div className="mt-3 md:mt-0 flex space-x-3">
            <Link 
              to="/matching" 
              className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              マッチング機能
            </Link>
            <Link 
              to="/premium/settings" 
              className="bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-dark-text-secondary font-medium py-2 px-4 border border-gray-300 dark:border-dark-border rounded-md transition-colors"
            >
              プレミアム設定
            </Link>
          </div>
        </div>

        {premiumStatus && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-dark-text-primary">現在のプレミアムステータス</h2>
                <ul className="space-y-2">
                  <li className="text-gray-700 dark:text-dark-text-secondary">
                    <span className="font-medium">プラン:</span> {formatPlanName(premiumStatus.plan)}
                  </li>
                  <li className="text-gray-700 dark:text-dark-text-secondary">
                    <span className="font-medium">ステータス:</span>{' '}
                    <span className={premiumStatus.isActive ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                      {premiumStatus.isActive ? 'アクティブ' : '期限切れ'}
                    </span>
                  </li>
                  <li className="text-gray-700 dark:text-dark-text-secondary">
                    <span className="font-medium">有効期限:</span> {formatDate(premiumStatus.expiry)}
                  </li>
                  <li className="text-gray-700 dark:text-dark-text-secondary">
                    <span className="font-medium">残り日数:</span>{' '}
                    <span className={premiumStatus.daysRemaining < 10 ? 'text-orange-600 dark:text-orange-300 font-bold' : ''}>
                      {premiumStatus.daysRemaining} 日
                    </span>
                    {premiumStatus.daysRemaining < 10 && ' （もうすぐ更新時期です）'}
                  </li>
                </ul>
              </div>
              
              <div className="mt-4 md:mt-0">
                <Link 
                  to="/premium/extend" 
                  className="block bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-md text-center transition-colors mb-3"
                >
                  プレミアム会員を延長する
                </Link>
                <Link 
                  to="/premium/cancel" 
                  className="block text-center text-gray-600 dark:text-dark-text-secondary hover:text-gray-800 dark:hover:text-dark-text-primary text-sm"
                >
                  自動更新を停止する
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {usageStats && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary">プレミアム機能の利用状況</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/matching" className="bg-white dark:bg-dark-surface p-5 rounded-lg shadow-sm border border-gray-200 dark:border-dark-border hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all">
              <div className="text-3xl mb-1">👥</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{usageStats.matchesViewed}</div>
              <div className="text-gray-600 dark:text-dark-text-secondary">表示されたマッチング候補</div>
            </Link>
            <Link to="/premium/matching" className="bg-white dark:bg-dark-surface p-5 rounded-lg shadow-sm border border-gray-200 dark:border-dark-border hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all">
              <div className="text-3xl mb-1">🤝</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{usageStats.matchesConnected}</div>
              <div className="text-gray-600 dark:text-dark-text-secondary">成立したマッチング</div>
            </Link>
            <div className="bg-white dark:bg-dark-surface p-5 rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
              <div className="text-3xl mb-1">📹</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{usageStats.savedVideos}</div>
              <div className="text-gray-600 dark:text-dark-text-secondary">保存した動画</div>
            </div>
            <div className="bg-white dark:bg-dark-surface p-5 rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
              <div className="text-3xl mb-1">🔔</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{usageStats.notificationsReceived}</div>
              <div className="text-gray-600 dark:text-dark-text-secondary">受信した通知</div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">マッチング済みユーザー</h2>
          <button 
            onClick={() => setShowMatchingSection(!showMatchingSection)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            {showMatchingSection ? '閉じる' : '表示する'}
          </button>
        </div>
        
        {showMatchingSection && (
          <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
            <MatchingSystem matchedOnly={true} limit={3} />
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">プレミアム会員特典</h2>
          <Link 
            to="/premium/matching" 
            className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            マッチング機能を試す
          </Link>
        </div>
        <PremiumFeatures showUpgradeButton={false} />
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-dark-text-primary">サポートとヘルプ</h2>
        <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
          プレミアム会員についてご質問やお困りのことがありましたら、お気軽にサポートチームまでご連絡ください。
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link 
            to="/support/premium" 
            className="bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-dark-text-secondary font-medium py-2 px-4 border border-gray-300 dark:border-dark-border rounded-md transition-colors text-center"
          >
            サポートへ問い合わせ
          </Link>
          <Link 
            to="/faq/premium" 
            className="bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-dark-text-secondary font-medium py-2 px-4 border border-gray-300 dark:border-dark-border rounded-md transition-colors text-center"
          >
            よくある質問を確認する
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PremiumDashboard;