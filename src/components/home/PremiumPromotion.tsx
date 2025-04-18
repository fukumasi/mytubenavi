// src/components/home/PremiumPromotion.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PremiumPromotion: React.FC = () => {
  const { isPremium, premiumStatus } = useAuth();

  // 非プレミアム会員向けのバナー部分
  if (!isPremium) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg overflow-hidden mt-2">
        <div className="p-4">
          <div className="flex items-center mb-2">
            <span className="text-yellow-300 text-xl mr-2">👑</span>
            <h2 className="text-white text-lg font-bold">プレミアム</h2>
          </div>
          <ul className="text-blue-100 text-xs space-y-1 mb-3">
            <li className="flex items-start">
              <span className="text-green-300 mr-1">✓</span>
              <span>マッチング10件表示</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-300 mr-1">✓</span>
              <span>全通知リアルタイム</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-300 mr-1">✓</span>
              <span>広告削減</span>
            </li>
          </ul>
          
          {/* 近日実装予定の通知を追加 */}
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mb-3 text-xs text-yellow-800 rounded-r">
            <strong>近日実装予定！</strong> 決済システム準備中です。
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-white font-bold">¥980<span className="text-xs text-blue-200">/月</span></span>
            <Link
              to="/premium/upgrade"
              className="bg-white hover:bg-blue-50 text-blue-600 text-xs font-semibold py-1 px-3 rounded shadow transition-colors"
            >
              詳細
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // プレミアム会員の場合はステータス表示
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '無期限';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // 期限切れの場合
  if (premiumStatus && !premiumStatus.isActive) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <span className="text-red-500 text-lg mr-2">⚠️</span>
            <h3 className="font-semibold text-red-700 text-sm">期限切れ</h3>
          </div>
          <p className="text-xs text-red-600 mb-2">
            {formatDate(premiumStatus.expiresAt)}
          </p>
          
          {/* 近日実装予定の通知を追加 */}
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mb-2 text-xs text-yellow-800 rounded-r">
            <strong>近日実装予定！</strong> 決済システム準備中です。
          </div>
          
          <Link
            to="/premium/upgrade"
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-xs rounded transition-colors w-full text-center"
          >
            更新する
          </Link>
        </div>
      </div>
    );
  }

  // 期限が近い場合（7日以内）
  if (premiumStatus && premiumStatus.daysRemaining !== null && premiumStatus.daysRemaining <= 7) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <span className="text-yellow-500 text-lg mr-2">⏰</span>
            <h3 className="font-semibold text-yellow-700 text-sm">あと{premiumStatus.daysRemaining}日</h3>
          </div>
          <p className="text-xs text-yellow-600 mb-2">
            {formatDate(premiumStatus.expiresAt)}まで
          </p>
          
          {/* 近日実装予定の通知を追加 */}
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mb-2 text-xs text-yellow-800 rounded-r">
            <strong>近日実装予定！</strong> 決済システム準備中です。
          </div>
          
          <Link
            to="/premium/extend"
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 text-xs rounded transition-colors w-full text-center"
          >
            延長する
          </Link>
        </div>
      </div>
    );
  }

  // 通常のプレミアム会員
  return (
    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-3 mt-2">
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <span className="text-lg mr-2">👑</span>
          <h3 className="font-semibold text-yellow-900 text-sm">プレミアム会員</h3>
        </div>
        <p className="text-xs text-yellow-800 mb-2">
          {formatDate(premiumStatus?.expiresAt)}まで
        </p>
        <Link
          to="/premium/dashboard"
          className="bg-white hover:bg-yellow-50 text-yellow-600 px-3 py-1 text-xs rounded shadow transition-colors w-full text-center"
        >
          ダッシュボード
        </Link>
      </div>
    </div>
  );
};

export default PremiumPromotion;