// src/pages/AdminDashboardPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminDashboard from '../components/admin/Dashboard';
import UserManagement from '../components/admin/UserManagement';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface StatCountProps {
  title: string;
  count: number;
  loading: boolean;
  bgColor: string;
}

const StatCount: React.FC<StatCountProps> = ({ title, count, loading, bgColor }) => (
  <div className={`${bgColor} rounded-lg shadow p-6`}>
    <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
    <p className="text-3xl font-bold">
      {loading ? <span className="text-gray-400">読み込み中...</span> : count}
    </p>
  </div>
);

const AdminDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('users');
  const [userCount, setUserCount] = useState<number>(0);
  const [videoCount, setVideoCount] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        // プロフィール情報を取得して管理者権限をチェック
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('プロフィール情報の取得に失敗しました:', error);
          navigate('/');
          return;
        }

        if (profile?.role !== 'admin') {
          console.warn('管理者権限がありません');
          navigate('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('認証チェックに失敗しました:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate]);

  // サイト全体の統計情報を取得
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        // ユーザー数を取得
        const { count: userCountData, error: userError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (userError) {
          console.error('ユーザー数の取得に失敗しました:', userError);
        } else {
          setUserCount(userCountData || 0);
        }

        // 動画数を取得
        const { count: videoCountData, error: videoError } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true });
        
        if (videoError) {
          console.error('動画数の取得に失敗しました:', videoError);
        } else {
          setVideoCount(videoCountData || 0);
        }

        // レビュー数を取得
        const { count: reviewCountData, error: reviewError } = await supabase
          .from('video_ratings')
          .select('*', { count: 'exact', head: true });
        
        if (reviewError) {
          console.error('レビュー数の取得に失敗しました:', reviewError);
        } else {
          setReviewCount(reviewCountData || 0);
        }
      } catch (error) {
        console.error('統計情報の取得に失敗しました:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // すでにナビゲートしているので何も表示しない
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">管理者ダッシュボード</h1>
      
      {/* 統計概要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCount
          title="登録ユーザー数"
          count={userCount}
          loading={statsLoading}
          bgColor="bg-white"
        />
        <StatCount
          title="登録動画数"
          count={videoCount}
          loading={statsLoading}
          bgColor="bg-white"
        />
        <StatCount
          title="レビュー数"
          count={reviewCount}
          loading={statsLoading}
          bgColor="bg-white"
        />
      </div>
      
      {/* タブナビゲーション */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleTabChange('users')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ユーザー管理
            </button>
            <button
              onClick={() => handleTabChange('analytics')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              統計・分析
            </button>
            <button
              onClick={() => handleTabChange('promotion')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'promotion'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              掲載枠管理
            </button>
          </nav>
        </div>
        
        <div className="p-4">
          {activeTab === 'users' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">ユーザー管理</h2>
              <p className="text-gray-600 mb-2">
                ユーザーアカウントの管理、権限設定、アクティビティ監視などの機能を提供します。
              </p>
              <UserManagement />
            </div>
          )}
          
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">統計・分析</h2>
              <p className="text-gray-600 mb-2">
                サイト利用状況、ユーザー行動、評価傾向などの詳細な分析データを提供します。
              </p>
              <div className="bg-gray-50 p-4 rounded border border-dashed border-gray-300 text-center">
                <p className="text-gray-500">統計・分析機能は開発中です</p>
              </div>
            </div>
          )}
          
          {activeTab === 'promotion' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">掲載枠管理</h2>
              <p className="text-gray-600 mb-2">
                YouTuber向け掲載枠の設定、管理、予約状況の確認などを行います。
              </p>
              <AdminDashboard />
            </div>
          )}
        </div>
      </div>
      
      {/* システム情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">システム情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">アプリケーションバージョン</p>
            <p className="font-medium">1.0.0</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">最終データベース更新</p>
            <p className="font-medium">{new Date().toLocaleDateString('ja-JP')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">サーバーステータス</p>
            <p className="font-medium text-green-500">正常稼働中</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">API状態</p>
            <p className="font-medium text-green-500">正常</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;