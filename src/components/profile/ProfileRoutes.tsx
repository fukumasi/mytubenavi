// src/components/profile/ProfileRoutes.tsx

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import UserProfile from './UserProfile';
import FavoriteVideos from './FavoriteVideos';
import ReviewHistory from './ReviewHistory';
import ViewHistory from './ViewHistory';
import NotificationsPage from './NotificationsPage';
import NotificationSettings from './NotificationSettings';
import SettingsPage from './SettingsPage';
import VerificationPage from './VerificationPage';
import MatchingSystem from '../matching/MatchingSystem';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Shield } from 'lucide-react';

export default function ProfileRoutes() {
  const location = useLocation();
  const { user, isPremium } = useAuth();
  const [matchCount, setMatchCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;

    const fetchMatchCount = async () => {
      try {
        setLoading(true);
        // プロフィールデータを取得して、マッチ可能なユーザー数をカウント
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id')
          .neq('id', user.id);

        if (error) {
          console.error('マッチングカウント取得エラー:', error);
        } else {
          // この例では単純にユーザー数をカウントしていますが、
          // 実際のマッチングロジックに応じてフィルタリングするとよいでしょう
          setMatchCount(profiles?.length || 0);
        }
      } catch (err) {
        console.error('マッチングカウント取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchCount();
  }, [user]);

  // アクティブなタブをチェックする関数
  const isActive = (path: string) => {
    return location.pathname === `/profile${path}`;
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="border-b">
        <nav className="flex overflow-x-auto">
          <Link
            to="/profile"
            className={`px-6 py-4 text-sm font-medium ${
              isActive('') 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            プロフィール
          </Link>
          <Link
            to="/profile/favorites"
            className={`px-6 py-4 text-sm font-medium ${
              isActive('/favorites') 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            お気に入り動画
          </Link>
          <Link
            to="/profile/reviews"
            className={`px-6 py-4 text-sm font-medium ${
              isActive('/reviews') 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            口コミ・評価履歴
          </Link>
          <Link
            to="/profile/history"
            className={`px-6 py-4 text-sm font-medium ${
              isActive('/history') 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            視聴履歴
          </Link>
          <Link
            to="/profile/matching"
            className={`px-6 py-4 text-sm font-medium flex items-center ${
              isActive('/matching') 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            おすすめユーザー
            {!loading && matchCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-indigo-100 bg-indigo-600 rounded-full">
                {matchCount}
              </span>
            )}
          </Link>
          <Link
            to="/profile/notifications"
            className={`px-6 py-4 text-sm font-medium ${
              isActive('/notifications') 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            通知
          </Link>
          <Link
            to="/profile/verification"
            className={`px-6 py-4 text-sm font-medium flex items-center ${
              isActive('/verification') 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            アカウント認証
            <Shield className="ml-1 h-4 w-4" />
          </Link>
          <Link
            to="/profile/settings"
            className={`px-6 py-4 text-sm font-medium ${
              isActive('/settings') 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            設定
          </Link>
        </nav>
      </div>

      <div className="p-6">
        <Routes>
          <Route path="/" element={<UserProfile />} />
          <Route path="/favorites" element={<FavoriteVideos />} />
          <Route path="/reviews" element={<ReviewHistory />} />
          <Route path="/history" element={<ViewHistory />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/matching" element={
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">おすすめユーザー</h2>
                {!isPremium && (
                  <Link 
                    to="/premium/upgrade" 
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    プレミアム会員になってフル機能を利用する
                  </Link>
                )}
              </div>
              
              {!isPremium && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Users className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        プレミアム会員限定の機能があります
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          プレミアム会員になると、メッセージ機能や詳細なユーザー情報の閲覧など、
                          より充実したマッチング機能をご利用いただけます。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <MatchingSystem limit={isPremium ? undefined : 5} />
            </div>
          } />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/profile" replace />} />
        </Routes>
      </div>
    </div>
  );
}