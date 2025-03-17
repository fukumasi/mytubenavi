// src/components/admin/Dashboard.tsx

import React, { useState, createContext, useCallback } from 'react';
import PromotionSlots from './PromotionSlots';
import UserManagement from './UserManagement';
import UserStatistics from './UserStatistics';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilm, 
  faUsers, 
  faChartLine, 
  faCog, 
  faMoneyBillWave,
  faChartBar,
  faSearch,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

// AdminContextの型定義
export type AdminContextType = {
  lastUpdate: number;
  refreshData: () => void;
  setError: (message: string | null) => void;
  error: string | null;
};

// AdminContextの作成
export const AdminContext = createContext<AdminContextType>({
  lastUpdate: 0,
  refreshData: () => {},
  setError: () => {},
  error: null
});

type DashboardTab = 'promotions' | 'users' | 'user-stats' | 'analytics' | 'settings' | 'payments';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('promotions');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // データの更新をトリガーする関数
  const refreshData = useCallback(() => {
    console.log('Dashboard: データ更新をトリガー');
    setLastUpdate(Date.now());
  }, []);

  // コンテキスト値の作成
  const adminContextValue: AdminContextType = {
    lastUpdate,
    refreshData,
    setError,
    error
  };

  // タブ変更時にエラーをリセット
  const handleTabChange = (tab: DashboardTab) => {
    setError(null);
    setActiveTab(tab);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'promotions':
        return <PromotionSlots />;
      case 'users':
        return <UserManagement />;
      case 'user-stats':
        return <UserStatistics />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'payments':
        return <PaymentManagement />;
      default:
        return <PromotionSlots />;
    }
  };

  // プレースホルダーコンポーネント
  const Analytics = () => (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">プラットフォーム分析</h2>
      <p>この機能は現在開発中です。より詳細な分析機能が近日公開予定です。</p>
      {/* 分析タブでもユーザー統計を表示 */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">ユーザー統計</h3>
        <UserStatistics />
      </div>
    </div>
  );

  const Settings = () => (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">管理者設定</h2>
      <p>この機能は現在開発中です。近日中に以下の機能が追加される予定です：</p>
      <ul className="list-disc ml-6 mt-4">
        <li>管理者アカウント設定</li>
        <li>通知設定</li>
        <li>システム設定</li>
        <li>メール連携設定</li>
      </ul>
    </div>
  );

  const PaymentManagement = () => (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">決済管理</h2>
      <p>この機能は現在開発中です。近日中に以下の機能が追加される予定です：</p>
      <ul className="list-disc ml-6 mt-4">
        <li>決済履歴の確認</li>
        <li>返金処理</li>
        <li>決済レポート</li>
        <li>課金プラン管理</li>
      </ul>
    </div>
  );

  return (
    <AdminContext.Provider value={adminContextValue}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* サイドナビゲーション */}
        <div className="w-full md:w-64 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">管理メニュー</h2>
          
          {/* 検索ボックス */}
          <div className="mb-4 relative">
            <div className="relative">
              <input
                type="text"
                placeholder="検索..."
                className="w-full px-4 py-2 border rounded pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-start">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 mt-1" />
              <div>{error}</div>
            </div>
          )}
          
          <nav>
            <ul className="space-y-2">
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded flex items-center ${
                    activeTab === 'promotions' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleTabChange('promotions')}
                >
                  <FontAwesomeIcon icon={faFilm} className="mr-2" />
                  掲載枠管理
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded flex items-center ${
                    activeTab === 'users' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleTabChange('users')}
                >
                  <FontAwesomeIcon icon={faUsers} className="mr-2" />
                  ユーザー管理
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded flex items-center ${
                    activeTab === 'user-stats' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleTabChange('user-stats')}
                >
                  <FontAwesomeIcon icon={faChartBar} className="mr-2" />
                  ユーザー統計
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded flex items-center ${
                    activeTab === 'analytics' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleTabChange('analytics')}
                >
                  <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                  分析
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded flex items-center ${
                    activeTab === 'payments' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleTabChange('payments')}
                >
                  <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
                  決済管理
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded flex items-center ${
                    activeTab === 'settings' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleTabChange('settings')}
                >
                  <FontAwesomeIcon icon={faCog} className="mr-2" />
                  設定
                </button>
              </li>
            </ul>
          </nav>

          {/* 最終更新時刻 */}
          <div className="mt-6 text-xs text-gray-500">
            最終更新: {new Date(lastUpdate).toLocaleString('ja-JP')}
          </div>

          {/* 手動更新ボタン */}
          <button
            className="mt-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            onClick={refreshData}
          >
            データを更新
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </AdminContext.Provider>
  );
};

export default Dashboard;