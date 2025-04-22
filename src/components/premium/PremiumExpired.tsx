import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumExpiredProps {
  expiredDate?: string;
  redirectUrl?: string;
}

const PremiumExpired: React.FC<PremiumExpiredProps> = ({ 
  expiredDate, 
  redirectUrl = '/premium/upgrade'
}) => {
  const { premiumStatus } = useAuth();
  const navigate = useNavigate();
  
  // 日付フォーマット
  const formatDate = (dateString?: string) => {
    if (!dateString) return '不明な日付';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return '不明な日付';
    }
  };

  // 実際に表示する期限切れ日付（優先順位: props > context > 現在）
  const displayExpiredDate = expiredDate || 
                            (premiumStatus?.expiresAt ? premiumStatus.expiresAt : new Date().toISOString());

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-center">
      <div className="mb-6">
        <span className="text-6xl">⏰</span>
      </div>
      
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary">プレミアム会員の期限が切れました</h1>
      
      <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
        {formatDate(displayExpiredDate)}に有効期限が切れました。
        引き続きプレミアム機能をご利用いただくには会員を更新してください。
      </p>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-3">
          プレミアム会員特典
        </h2>
        <ul className="text-left space-y-2 mb-4 text-gray-700 dark:text-dark-text-secondary">
          <li className="flex items-start">
            <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>マッチング機能のフル利用（10件の候補表示と接続リクエスト）</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>すべての通知をリアルタイムで受信</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>広告表示の削減</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>高度な検索機能とフィルター</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>無制限のお気に入り保存</span>
          </li>
        </ul>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to={redirectUrl}
          className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          今すぐ更新する
        </Link>
        
        <button
          onClick={() => navigate('/')}
          className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-dark-text-primary font-medium py-3 px-6 rounded-lg transition-colors"
        >
          ホームに戻る
        </button>
      </div>
      
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        ご質問やお困りのことがありましたら、<Link to="/support" className="text-blue-600 dark:text-blue-400 hover:underline">サポート</Link>までお問い合わせください。
      </p>
    </div>
  );
};

export default PremiumExpired;