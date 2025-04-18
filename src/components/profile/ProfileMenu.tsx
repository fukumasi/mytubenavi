import { NavLink } from 'react-router-dom';
import { User, Star, History, Bell, Settings, Heart, Crown, MessageSquare, Calendar, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function ProfileMenu() {
  const { isPremium, premiumStatus } = useAuth();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [badgeColor, setBadgeColor] = useState<string>('yellow');

  useEffect(() => {
    if (premiumStatus) {
      setDaysRemaining(premiumStatus.daysRemaining);
      
      // 残り日数に応じてバッジの色を変更
      if (premiumStatus.daysRemaining !== null) {
        if (premiumStatus.daysRemaining <= 3) {
          setBadgeColor('red');
        } else if (premiumStatus.daysRemaining <= 7) {
          setBadgeColor('orange');
        } else {
          setBadgeColor('yellow');
        }
      }
    }
  }, [premiumStatus]);

  // プレミアムバッジテキストの生成
  const getPremiumBadgeText = () => {
    if (!isPremium) return undefined;
    if (daysRemaining === null) return '有効';
    if (daysRemaining <= 0) return '期限切れ';
    if (daysRemaining <= 7) return `残り${daysRemaining}日`;
    return '有効';
  };

  const menuItems = [
    {
      path: '/profile',
      icon: <User className="h-5 w-5" />,
      label: 'プロフィール'
    },
    {
      path: '/profile/favorites',
      icon: <Heart className="h-5 w-5" />,
      label: 'お気に入り動画'
    },
    {
      path: '/profile/reviews',
      icon: <Star className="h-5 w-5" />,
      label: '評価・レビュー'
    },
    {
      path: '/profile/history',
      icon: <History className="h-5 w-5" />,
      label: '視聴履歴'
    },
    {
      path: '/profile/notifications',
      icon: <Bell className="h-5 w-5" />,
      label: '新着通知'
    },
    {
      path: isPremium ? '/premium/dashboard' : '/premium/upgrade',
      icon: <Crown className={`h-5 w-5 ${isPremium ? 'text-yellow-500' : 'text-gray-400'}`} />,
      label: 'プレミアム',
      badge: getPremiumBadgeText(),
      badgeColor
    },
    ...(isPremium ? [
      {
        path: '/premium/matching',
        icon: <MessageSquare className="h-5 w-5" />,
        label: 'マッチング'
      },
      {
        path: '/premium/advanced-search',
        icon: <Search className="h-5 w-5" />,
        label: '高度な検索'
      },
      {
        path: '/premium/events',
        icon: <Calendar className="h-5 w-5" />,
        label: 'プレミアムイベント'
      }
    ] : []),
    {
      path: '/profile/settings',
      icon: <Settings className="h-5 w-5" />,
      label: '設定'
    }
  ];

  return (
    <nav className="space-y-1">
      {menuItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-900 hover:bg-gray-100'
            }`
          }
        >
          <span className="mr-3">{item.icon}</span>
          {item.label}
          {item.badge && (
            <span className={`ml-auto bg-${item.badgeColor || 'yellow'}-100 text-${item.badgeColor || 'yellow'}-800 text-xs px-2 py-1 rounded-full`}>
              {item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}