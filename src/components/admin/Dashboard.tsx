// src/components/admin/Dashboard.tsx

import React, { useState } from 'react';
import PromotionSlots from './PromotionSlots';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilm, 
  faUsers, 
  faChartLine, 
  faCog, 
  faMoneyBillWave 
} from '@fortawesome/free-solid-svg-icons';

type DashboardTab = 'promotions' | 'users' | 'analytics' | 'settings' | 'payments';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('promotions');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'promotions':
        return <PromotionSlots />;
      case 'users':
        return <UserManagement />;
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
  const UserManagement = () => (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">ユーザー管理</h2>
      <p>この機能は現在開発中です。</p>
    </div>
  );

  const Analytics = () => (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">分析</h2>
      <p>この機能は現在開発中です。</p>
    </div>
  );

  const Settings = () => (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">設定</h2>
      <p>この機能は現在開発中です。</p>
    </div>
  );

  const PaymentManagement = () => (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">決済管理</h2>
      <p>この機能は現在開発中です。</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* サイドナビゲーション */}
      <div className="w-full md:w-64 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">管理メニュー</h2>
        <nav>
          <ul className="space-y-2">
            <li>
              <button
                className={`w-full text-left px-4 py-2 rounded flex items-center ${
                  activeTab === 'promotions' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('promotions')}
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
                onClick={() => setActiveTab('users')}
              >
                <FontAwesomeIcon icon={faUsers} className="mr-2" />
                ユーザー管理
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-4 py-2 rounded flex items-center ${
                  activeTab === 'analytics' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('analytics')}
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
                onClick={() => setActiveTab('payments')}
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
                onClick={() => setActiveTab('settings')}
              >
                <FontAwesomeIcon icon={faCog} className="mr-2" />
                設定
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