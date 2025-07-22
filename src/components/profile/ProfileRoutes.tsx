import { useLocation, Routes, Route, Navigate, Link } from 'react-router-dom';
import useMediaQuery from '@/hooks/useMediaQuery';
import UserProfile from './UserProfile';
import FavoriteVideos from './FavoriteVideos';
import ReviewHistory from './ReviewHistory';
import ViewHistory from './ViewHistory';
import NotificationsPage from './NotificationsPage';
import NotificationSettings from './NotificationSettings';
import SettingsPage from './SettingsPage';
import VerificationPage from './VerificationPage';
import MatchingCandidates from './MatchingCandidates';
import IncomingLikes from './IncomingLikes';
import LikedUsers from './LikedUsers';
import MatchHistory from './MatchHistory';
import MessagesPage from './MessagesPage';
import {
  User, Heart, Star, History, Users, HeartHandshake, ThumbsUp, Clock,
  Bell, BellRing, Shield, Settings, MessageCircle
} from 'lucide-react';

export default function ProfileRoutes() {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const isActive = (path: string) => {
    return location.pathname === `/profile${path}`;
  };

  const allTabs = [
    { path: '', label: 'プロフィール', icon: <User className="h-5 w-5" /> },
    { path: '/favorites', label: 'お気に入り', icon: <Heart className="h-5 w-5" /> },
    { path: '/reviews', label: '評価履歴', icon: <Star className="h-5 w-5" /> },
    { path: '/history', label: '視聴履歴', icon: <History className="h-5 w-5" /> },
    { path: '/matching', label: 'おすすめ', icon: <Users className="h-5 w-5" /> },
    { path: '/incoming-likes', label: 'いいねされた', icon: <HeartHandshake className="h-5 w-5" /> },
    { path: '/liked-users', label: 'いいねした', icon: <ThumbsUp className="h-5 w-5" /> },
    { path: '/match-history', label: 'マッチ履歴', icon: <Clock className="h-5 w-5" /> },
    { path: '/messages', label: 'メッセージ', icon: <MessageCircle className="h-5 w-5" /> },
    { path: '/notifications', label: '通知', icon: <Bell className="h-5 w-5" /> },
    { path: '/notification-settings', label: '通知設定', icon: <BellRing className="h-5 w-5" /> },
    { path: '/verification', label: 'アカウント認証', icon: <Shield className="h-5 w-5" /> },
    { path: '/settings', label: '設定', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="bg-white dark:bg-dark-surface shadow-sm dark:shadow-none dark:border dark:border-dark-border rounded-lg overflow-hidden">
      
      {/* PC版はタブ型ナビゲーション */}
      {!isMobile && (
        <div className="border-b dark:border-dark-border">
          <nav className="flex overflow-x-auto">
            {allTabs.map(tab => (
              <Link
                key={tab.path}
                to={`/profile${tab.path}`}
                className={`px-6 py-4 text-sm font-semibold flex items-center whitespace-nowrap transition-colors ${
                  isActive(tab.path)
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      

      {/* メインコンテンツ */}
      <div className={`p-6 ${isMobile ? 'pb-20' : ''}`}>
        <Routes>
          <Route path="/" element={<UserProfile />} />
          <Route path="/favorites" element={<FavoriteVideos />} />
          <Route path="/reviews" element={<ReviewHistory />} />
          <Route path="/history" element={<ViewHistory />} />
          <Route path="/matching" element={<MatchingCandidates />} />
          <Route path="/incoming-likes" element={<IncomingLikes />} />
          <Route path="/liked-users" element={<LikedUsers />} />
          <Route path="/match-history" element={<MatchHistory />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/profile" replace />} />
        </Routes>
      </div>
    </div>
  );
}
