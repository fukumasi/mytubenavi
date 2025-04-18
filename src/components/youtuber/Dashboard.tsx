// src/components/youtuber/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, 
  faCalendarAlt, 
  faCog, 
  faQuestionCircle,
  faHistory,
  faChartBar // 効果分析アイコン用に追加
} from '@fortawesome/free-solid-svg-icons';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PromotionStats from './PromotionStats';
import PromotionAnalytics from './PromotionAnalytics';
import BookingForm from './BookingForm';
import BookingHistory from './BookingHistory';
import { PromotionStats as PromotionStatsType } from '@/types/promotion';
import AnalyticsDashboard from './AnalyticsDashboard'; // 直接インポート

type DashboardTab = 'stats' | 'bookings' | 'history' | 'analytics' | 'settings' | 'help' | 'effect';

const Dashboard: React.FC = () => {
  console.log("Dashboard コンポーネントがレンダリングされました");
  const [activeTab, setActiveTab] = useState<DashboardTab>('stats');
  const [loading, setLoading] = useState<boolean>(true);
  const [youtuberData, setYoutuberData] = useState<any>(null);
  const [showBookingForm, setShowBookingForm] = useState<boolean>(false);
  const [statsData, setStatsData] = useState<PromotionStatsType | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  useEffect(() => {
    console.log("Dashboard useEffect 実行");
    const fetchYoutuberData = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('ユーザーが認証されていません');
          setLoading(false);
          return;
        }
        
        // 406エラーを回避するためにプロフィールテーブルから情報を取得
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('プロフィール情報の取得に失敗しました:', profileError);
        } else {
          // プロフィールデータをYouTuberデータとして扱う
          setYoutuberData({
            channel_name: profileData?.username || 'チャンネル名未設定',
            ...profileData
          });
        }
        
        // 最終同期時間はエラー処理を追加して取得
        try {
          const { data: syncData, error: syncError } = await supabase
            .from('youtube_sync_logs')
            .select('created_at')
            .eq('youtuber_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (!syncError && syncData && syncData.length > 0) {
            setLastSyncTime(syncData[0].created_at);
          }
        } catch (syncErr) {
          console.error('同期情報の取得に失敗しました:', syncErr);
        }
        
      } catch (error) {
        console.error('情報の取得中にエラーが発生しました:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchYoutuberData();
    fetchStats();
  }, []);
  
  const fetchStats = async () => {
    try {
      // ダミーデータを用意
      // 実際のアプリケーションでは、APIやSupabaseからデータを取得する
      const dummyStats: PromotionStatsType = {
        totalBookings: 0,
        totalRevenue: 0,
        activeBookings: 0,
        averageRating: 0,
        viewsData: [],
        averageCTR: 0,
        // PromotionStatsコンポーネントのために追加
        impressions: 0,
        clicks: 0,
        ctr: 0,
        revenue: 0
      };
      
      setStatsData(dummyStats);
    } catch (error) {
      console.error('統計データの取得中にエラーが発生しました:', error);
    }
  };
  
  const triggerSync = async () => {
    try {
      setSyncStatus('syncing');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('ユーザーが認証されていません');
        setSyncStatus('error');
        return;
      }
      
      // YouTubeチャンネル同期のためのAPIリクエストを送信
      // 実際のコードはuseYoutuberSyncフックに合わせて変更する必要があります
      
      // ダミー実装（実際のアプリケーションでは適切な同期処理を実装）
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // 同期完了を記録
        const now = new Date().toISOString();
        await supabase
          .from('youtube_sync_logs')
          .insert([
            {
              youtuber_id: user.id,
              status: 'success',
              details: 'チャンネル同期が完了しました',
              created_at: now
            }
          ]);
          
        setLastSyncTime(now);
        setSyncStatus('success');
      } catch (insertErr) {
        console.error('同期ログの追加に失敗しました:', insertErr);
        setSyncStatus('error');
      }
      
    } catch (error) {
      console.error('チャンネル同期中にエラーが発生しました:', error);
      setSyncStatus('error');
    }
  };
  
  const handleTabClick = (tab: DashboardTab) => {
    console.log(`タブ切り替え: ${activeTab} -> ${tab}`);
    setActiveTab(tab);
  };
  
  const renderTabContent = () => {
    console.log("renderTabContent が呼び出されました。現在のタブ:", activeTab);
    
    const defaultStats = {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      revenue: 0,
      totalBookings: 0,
      totalRevenue: 0,
      activeBookings: 0,
      averageRating: 0,
      viewsData: [],
      averageCTR: 0
    };

    switch (activeTab) {
      case 'stats':
        console.log("stats タブを表示");
        // 型キャストを使用して一時的に型チェックをバイパス
        return <PromotionStats stats={(statsData || defaultStats) as any} />;
      case 'bookings':
        console.log("bookings タブを表示");
        return <BookingManagement />;
      case 'history':
        console.log("history タブを表示");
        return <BookingHistory />;
      case 'analytics':
        console.log("analytics タブを表示");
        return <PromotionAnalytics />;
      case 'settings':
        console.log("settings タブを表示");
        return <Settings />;
      case 'help':
        console.log("help タブを表示");
        return <Help />;
      case 'effect':
        console.log("effect タブを表示 - AnalyticsDashboard を initialTab='effect' で表示");
        // 掲載効果分析タブを直接表示
        return <AnalyticsDashboard initialTab="effect" />;
      default:
        console.log("デフォルトタブを表示 (activeTab が不明な値である可能性があります)");
        // 型キャストを使用して一時的に型チェックをバイパス
        return <PromotionStats stats={(statsData || defaultStats) as any} />;
    }
  };
  
  // 掲載枠予約管理コンポーネント
  const BookingManagement = () => (
    <div className="p-6 bg-white rounded shadow">
      {showBookingForm ? (
        <BookingForm 
          onSuccess={() => {
            setShowBookingForm(false);
            // ここで必要であれば成功メッセージを表示するなどの処理を追加できる
          }} 
          onCancel={() => setShowBookingForm(false)} 
        />
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-4">掲載枠予約管理</h2>
          <p className="mb-4">現在利用可能な掲載枠を予約し、あなたの動画をプロモーションすることができます。</p>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">掲載枠タイプ</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>プレミアム枠 - トップページの目立つ位置に表示</li>
              <li>サイドバー枠 - サイドバーに固定表示</li>
              <li>ジャンル枠 - 特定のジャンルページで優先表示</li>
              <li>関連動画枠 - 関連動画として表示率アップ</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              onClick={() => setShowBookingForm(true)}
            >
              掲載枠を予約する
            </button>
          </div>
        </>
      )}
    </div>
  );
  
  const Settings = () => (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">設定</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">チャンネル同期</h3>
        <p className="mb-2 text-sm text-gray-600">
          {lastSyncTime 
            ? `最終同期: ${new Date(lastSyncTime).toLocaleString('ja-JP')}`
            : 'まだ同期していません'}
        </p>
        <button 
          onClick={triggerSync}
          disabled={syncStatus === 'syncing'}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:bg-gray-400"
        >
          {syncStatus === 'syncing' ? '同期中...' : 'YouTubeと同期する'}
        </button>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">通知設定</h3>
        <div className="flex items-center mb-2">
          <input type="checkbox" id="email-notify" className="mr-2" />
          <label htmlFor="email-notify">メールで通知を受け取る</label>
        </div>
        <div className="flex items-center">
          <input type="checkbox" id="app-notify" className="mr-2" />
          <label htmlFor="app-notify">アプリ内通知を受け取る</label>
        </div>
      </div>
    </div>
  );
  
  const Help = () => (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">ヘルプ</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">掲載枠について</h3>
          <p>掲載枠は、あなたの動画をMyTubeNaviのさまざまな場所で宣伝するための機能です。</p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">よくある質問</h3>
          <div className="space-y-2">
            <div>
              <h4 className="font-medium">Q: 掲載枠はいつから利用できますか？</h4>
              <p>A: お支払いが完了次第、すぐに掲載が開始されます。</p>
            </div>
            <div>
              <h4 className="font-medium">Q: 掲載枠の効果はどのように確認できますか？</h4>
              <p>A: ダッシュボードの「分析」タブで、掲載枠のパフォーマンスを確認できます。</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">お問い合わせ</h3>
          <p>より詳しい情報が必要な場合は、<a href="mailto:support@mytubenavi.com" className="text-blue-600 hover:underline">support@mytubenavi.com</a>までお問い合わせください。</p>
        </div>
      </div>
    </div>
  );
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }
  
  // activeTabの値をコンソールに出力して確認
  console.log("現在のアクティブタブ:", activeTab);
  
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* サイドナビゲーション */}
      <div className="w-full md:w-64 bg-white p-4 rounded shadow">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">YouTuberダッシュボード</h2>
          {youtuberData && (
            <p className="text-sm text-gray-600">{youtuberData.channel_name || 'チャンネル名未設定'}</p>
          )}
        </div>
        
        <nav>
          <ul className="space-y-2">
            <li>
              <button
                className={`w-full text-left px-4 py-2 rounded flex items-center ${
                  activeTab === 'stats' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleTabClick('stats')}
              >
                <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                掲載枠の概要
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-4 py-2 rounded flex items-center ${
                  activeTab === 'bookings' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleTabClick('bookings')}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                掲載枠予約
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-4 py-2 rounded flex items-center ${
                  activeTab === 'history' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleTabClick('history')}
              >
                <FontAwesomeIcon icon={faHistory} className="mr-2" />
                予約履歴
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-4 py-2 rounded flex items-center ${
                  activeTab === 'analytics' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleTabClick('analytics')}
              >
                <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                分析
              </button>
            </li>
            {/* 掲載効果分析タブを追加 - ここが重要なポイント */}
            <li className="relative">
              <button
                className={`w-full text-left px-4 py-2 rounded flex items-center ${
                  activeTab === 'effect' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleTabClick('effect')}
              >
                <FontAwesomeIcon icon={faChartBar} className="mr-2" />
                掲載効果分析
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-4 py-2 rounded flex items-center ${
                  activeTab === 'settings' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleTabClick('settings')}
              >
                <FontAwesomeIcon icon={faCog} className="mr-2" />
                設定
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-4 py-2 rounded flex items-center ${
                  activeTab === 'help' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleTabClick('help')}
              >
                <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
                ヘルプ
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Dashboard;