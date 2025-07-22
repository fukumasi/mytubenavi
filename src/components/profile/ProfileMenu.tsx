import { NavLink } from 'react-router-dom';
import { User, Star, History, Bell, Settings, Heart, Crown, MessageSquare, Calendar, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function ProfileMenu() {
  // useAuthフックから必要な情報を取得
  const { isPremium, premiumStatus } = useAuth();

  // プレミアム有効期間の残り日数を管理するstate
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  // プレミアムバッジの色を管理するstate (デフォルトはyellow)
  const [badgeColor, setBadgeColor] = useState<string>('yellow');

  // premiumStatusの変更を監視し、残り日数とバッジの色を更新
  useEffect(() => {
    if (premiumStatus) {
      setDaysRemaining(premiumStatus.daysRemaining);

      // 残り日数に応じてバッジの色を変更
      if (premiumStatus.daysRemaining !== null) {
        if (premiumStatus.daysRemaining <= 3) {
          setBadgeColor('red'); // 3日以下は赤
        } else if (premiumStatus.daysRemaining <= 7) {
          setBadgeColor('orange'); // 4日〜7日はオレンジ
        } else {
          setBadgeColor('yellow'); // 8日以上は黄色
        }
      }
    }
  }, [premiumStatus]); // premiumStatusが変わったときのみ実行

  // プレミアムバッジに表示するテキストを生成する関数
  const getPremiumBadgeText = () => {
    // プレミアム会員でない場合はバッジなし
    if (!isPremium) return undefined;
    // 残り日数が不明の場合は「有効」と表示
    if (daysRemaining === null) return '有効';
    // 残り日数が0以下の場合は「期限切れ」と表示
    if (daysRemaining <= 0) return '期限切れ';
    // 残り日数が7日以下の場合は「残り〇日」と表示
    if (daysRemaining <= 7) return `残り${daysRemaining}日`;
    // それ以外の場合は「有効」と表示
    return '有効';
  };

  // プロフィールメニューの項目リストを定義
  const menuItems = [
    {
      path: '/profile', // リンク先パス
      icon: <User className="h-5 w-5" />, // アイコンコンポーネント
      label: 'プロフィール' // メニュー項目ラベル
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
      // プレミアム会員かどうかでリンク先を変更
      path: isPremium ? '/premium/dashboard' : '/premium/upgrade',
      // プレミアム会員かどうかでアイコンの色を変更 (テンプレートリテラルで修正)
      icon: <Crown className={`h-5 w-5 ${isPremium ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`} />,
      label: 'プレミアム',
      badge: getPremiumBadgeText(), // バッジテキストを関数で取得
      badgeColor // バッジの色
    },
    // プレミアム会員の場合のみ表示するメニュー項目をスプレッド構文で追加
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
    ] : []), // プレミアム会員でない場合は空配列を追加
    {
      path: '/profile/settings',
      icon: <Settings className="h-5 w-5" />,
      label: '設定'
    }
  ];

  return (
    <nav className="space-y-1">
      {/* menuItems配列をマップしてNavLinkをレンダリング */}
      {menuItems.map(item => (
        <NavLink
          key={item.path} // 一意なkeyを設定
          to={item.path} // リンク先パス
          // NavLinkのclassNameは関数で定義し、isActiveに応じてスタイルを切り替え (テンプレートリテラルで修正)
          className={({ isActive }) =>
            `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' // アクティブ時のスタイル
                : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-dark-surface' // 非アクティブ時のスタイル
            }`
          }
        >
          {/* アイコン */}
          <span className="mr-3">{item.icon}</span>
          {/* ラベル */}
          {item.label}
          {/* バッジ（badgeテキストが存在する場合のみ表示） */}
          {item.badge && (
            // バッジのスタイルを定義 (テンプレートリテラルで修正)
            <span className={`ml-auto bg-${item.badgeColor || 'yellow'}-100 dark:bg-${item.badgeColor || 'yellow'}-900/30 text-${item.badgeColor || 'yellow'}-800 dark:text-${item.badgeColor || 'yellow'}-300 text-xs px-2 py-1 rounded-full`}>
              {item.badge} {/* バッジテキスト */}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}