import { Link } from 'react-router-dom';
import { X, Home, User, Heart, Star, History, Users, HeartHandshake, ThumbsUp, Clock, MessageCircle, Bell, BellRing, Shield, Settings, Crown, Search, LogIn, UserPlus, Youtube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium: boolean;
}

export default function MobileMenu({ isOpen, onClose, isPremium }: MobileMenuProps) {
  const { user } = useAuth();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end md:items-start md:justify-end bg-black bg-opacity-30"
      onClick={onClose}
    >
      {/* メニュー本体 */}
      <div
        className="w-full h-5/6 bg-white dark:bg-dark-surface rounded-t-2xl p-6 overflow-y-auto md:rounded-none md:h-full md:w-80 md:shadow-lg md:border-l md:border-gray-200 dark:md:border-dark-border"
        onClick={(e) => e.stopPropagation()} // ← 本体クリックで背景閉じない
      >
        <div className="flex justify-end mb-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="space-y-4">
          <LinkItem to="/" onClose={onClose} icon={<Home />} label="ホーム" />

          {user ? (
            <>
              <LinkItem to="/profile" onClose={onClose} icon={<User />} label="プロフィール" />
              <LinkItem to="/profile/favorites" onClose={onClose} icon={<Heart />} label="お気に入り" />
              <LinkItem to="/profile/reviews" onClose={onClose} icon={<Star />} label="評価履歴" />
              <LinkItem to="/profile/history" onClose={onClose} icon={<History />} label="視聴履歴" />
              <LinkItem to="/profile/matching" onClose={onClose} icon={<Users />} label="おすすめ" />
              <LinkItem to="/profile/incoming-likes" onClose={onClose} icon={<HeartHandshake />} label="いいねされた" />
              <LinkItem to="/profile/liked-users" onClose={onClose} icon={<ThumbsUp />} label="いいねした" />
              <LinkItem to="/profile/match-history" onClose={onClose} icon={<Clock />} label="マッチ履歴" />
              <LinkItem to="/profile/messages" onClose={onClose} icon={<MessageCircle />} label="メッセージ" />
              <LinkItem to="/profile/notifications" onClose={onClose} icon={<Bell />} label="通知" />
              <LinkItem to="/profile/notification-settings" onClose={onClose} icon={<BellRing />} label="通知設定" />
              <LinkItem to="/profile/verification" onClose={onClose} icon={<Shield />} label="アカウント認証" />
              <LinkItem to="/profile/settings" onClose={onClose} icon={<Settings />} label="設定" />
              <LinkItem to="/premium" onClose={onClose} icon={<Crown />} label={isPremium ? 'プレミアム' : 'プレミアム登録'} />
              <LinkItem to="/premium/advanced-search" onClose={onClose} icon={<Search />} label="動画検索" />
            </>
          ) : (
            <>
              <LinkItem to="/login" onClose={onClose} icon={<LogIn />} label="ログイン" />
              <LinkItem to="/signup" onClose={onClose} icon={<UserPlus />} label="新規登録" />
              <LinkItem to="/youtuber/register" onClose={onClose} icon={<Youtube />} label="YouTuber登録" />
            </>
          )}
        </nav>
      </div>
    </div>
  );
}

// 個別リンクコンポーネント
function LinkItem({ to, onClose, icon, label }: { to: string, onClose: () => void, icon: React.ReactNode, label: string }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-700 dark:text-gray-200"
    >
      <div className="h-5 w-5">{icon}</div>
      <span>{label}</span>
    </Link>
  );
}
