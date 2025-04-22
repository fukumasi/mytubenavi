import React from 'react';
import { Link } from 'react-router-dom';

interface FeatureProps {
  title: string;
  description: string;
  icon: string;
  premium?: boolean;
}

interface PremiumFeaturesProps {
  showUpgradeButton?: boolean;
  compact?: boolean;
  className?: string;
}

const FEATURES: FeatureProps[] = [
  {
    icon: '👥',
    title: 'マッチング機能',
    description: '一般会員: 3件の候補表示と閲覧のみ。プレミアム会員: 10件の候補表示とすべての機能利用可能。',
    premium: true
  },
  {
    icon: '🔔',
    title: '通知システム',
    description: '一般会員: 重要な通知のみ。プレミアム会員: すべての通知をリアルタイムで受信可能。',
    premium: true
  },
  {
    icon: '📊',
    title: '詳細な視聴統計',
    description: '一般会員: 基本的な視聴履歴のみ。プレミアム会員: 視聴傾向の詳細分析と推奨コンテンツの提案。',
    premium: true
  },
  {
    icon: '🔍',
    title: '高度な検索機能',
    description: '一般会員: 基本検索のみ。プレミアム会員: 複合条件やフィルターを使った高度な検索が可能。',
    premium: true
  },
  {
    icon: '📱',
    title: '広告表示',
    description: '一般会員: 通常の広告表示。プレミアム会員: サイト内広告の大幅削減。',
    premium: true
  },
  {
    icon: '💾',
    title: 'お気に入り保存',
    description: '一般会員: 50件まで保存可能。プレミアム会員: 無制限に保存可能。',
    premium: true
  },
  {
    icon: '📋',
    title: 'コメント機能',
    description: 'すべての会員が利用可能。動画に対する感想や意見を共有できます。',
    premium: false
  },
  {
    icon: '⭐',
    title: '評価機能',
    description: 'すべての会員が利用可能。動画に星評価を付けることができます。',
    premium: false
  }
];

const PremiumFeatures: React.FC<PremiumFeaturesProps> = ({
  showUpgradeButton = true,
  compact = false,
  className = ''
}) => {
  return (
    <div className={`premium-features ${className}`}>
      {!compact && (
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-dark-text-primary">MyTubeNaviの機能比較</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            一般会員とプレミアム会員で利用できる機能の違いをご確認ください
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feature, index) => (
          <div 
            key={index} 
            className={`bg-white dark:bg-dark-surface rounded-lg p-5 shadow-sm border ${
              feature.premium 
                ? 'border-yellow-200 dark:border-yellow-800/50 bg-gradient-to-br from-white dark:from-dark-surface to-yellow-50 dark:to-yellow-900/20' 
                : 'border-gray-200 dark:border-dark-border'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4 text-2xl">
                {feature.icon}
              </div>
              <div>
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-dark-text-primary">{feature.title}</h3>
                  {feature.premium && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded-full">
                      プレミアム
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-dark-text-secondary text-sm">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showUpgradeButton && (
        <div className="text-center mt-8">
          <Link 
            to="/premium/upgrade" 
            className="inline-block bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            プレミアム会員にアップグレード
          </Link>
          <p className="mt-3 text-sm text-gray-600 dark:text-dark-text-secondary">
            より快適なYouTube体験のためにプレミアム会員をおすすめします
          </p>
        </div>
      )}
    </div>
  );
};

export default PremiumFeatures;