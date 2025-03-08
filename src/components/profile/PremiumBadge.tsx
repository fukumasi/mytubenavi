import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PremiumBadgeProps {
  // 表示サイズ: small, medium, large
  size?: 'sm' | 'md' | 'lg';
  // バッジをクリックしたときのリンク先を無効化
  disableLink?: boolean;
  // カスタムクラス名
  className?: string;
  // ツールチップの表示位置
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  // 追加表示テキスト（残り日数など）
  additionalText?: string;
  // バッジの色をカスタマイズ
  colorClass?: string;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  size = 'md',
  disableLink = false,
  className = '',
  tooltipPosition = 'top',
  additionalText,
  colorClass = 'text-yellow-500'
}) => {
  const { isPremium } = useAuth();

  if (!isPremium) return null;

  // サイズに基づくクラス名
  const sizeClasses = {
    sm: 'text-xs p-1',
    md: 'text-sm p-1.5',
    lg: 'text-base p-2'
  };

  // ツールチップの位置クラス
  const tooltipPositionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-1',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-1',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-1'
  };

  // バッジのベースコンポーネント
  const Badge = () => (
    <span 
      className={`inline-flex items-center rounded-full group relative ${sizeClasses[size]} ${className}`}
      data-testid="premium-badge"
    >
      <span className={`${colorClass} group-hover:animate-pulse`}>👑</span>

      {additionalText && (
        <span className="ml-1 text-gray-700 font-medium">
          {additionalText}
        </span>
      )}

      {/* ツールチップ */}
      <div 
        className={`absolute ${tooltipPositionClasses[tooltipPosition]} hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none`}
      >
        プレミアム会員
      </div>
    </span>
  );

  // リンクなしの場合
  if (disableLink) {
    return <Badge />;
  }

  // リンク付きバッジ
  return (
    <Link 
      to="/premium/dashboard" 
      className="inline-block cursor-pointer hover:opacity-90 transition-opacity"
    >
      <Badge />
    </Link>
  );
};

export default PremiumBadge;