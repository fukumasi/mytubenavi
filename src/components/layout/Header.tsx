// src/components/layout/Header.tsx
import { useState, useEffect, useRef } from 'react';
import { LogIn, UserPlus, Youtube, User, Menu, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import SearchBar from '../search/SearchBar';
import NotificationBell from './NotificationBell';
import NotificationSound from './NotificationSound';
import MobileMenu from '../ui/MobileMenu';
// 使用していないuseMediaQueryをimportから削除
// import useMediaQuery from '../../hooks/useMediaQuery';

export default function Header() {
  const { currentUser, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('avatar_url, username')
            .eq('id', currentUser.id)
            .single();

          if (error) throw error;
          if (profile) {
            setAvatarUrl(profile.avatar_url);
            setUsername(profile.username);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
      setLoading(false);
    };

    fetchUserProfile();
  }, [currentUser]);

  // ユーザーメニュー外をクリックした時にメニューを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef]);

  const handleLogout = async () => {
    try {
      setIsUserMenuOpen(false); // まずメニューを閉じる
      await signOut(); // signOut関数を呼び出し（この中でリロードされるため、以下は実行されない可能性があります）
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  // SearchBarの実装を確認して対応
  // SearchBarにonSearchプロパティがない場合、下のモバイル用検索バーの部分を修正

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-indigo-600">MyTubeNavi</h1>
            </Link>
          </div>

          {/* デスクトップ用検索バー */}
          <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-8">
            <SearchBar />
          </div>

          {/* モバイル用検索アイコン */}
          <div className="md:hidden flex items-center mr-2">
            <button
              onClick={toggleSearch}
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              aria-label="検索"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-3">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            ) : currentUser ? (
              <>
                <div className="hidden sm:block">
                  <NotificationBell />
                </div>
                <NotificationSound />
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <span className="hidden sm:block">
                      {username || currentUser.email?.split('@')[0]}
                    </span>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-10">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        プロフィール
                      </Link>
                      <Link
                        to="/profile/notifications"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        通知 {unreadCount > 0 && `(${unreadCount})`}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        ログアウト
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* デスクトップ用ログインボタン */}
                <div className="hidden sm:flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <LogIn className="h-4 w-4 mr-1" />
                    ログイン
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    新規登録
                  </Link>
                  <Link
                    to="/youtuber/register"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Youtube className="h-4 w-4 mr-1" />
                    YouTuber
                  </Link>
                </div>

                {/* モバイル用簡易ログインアイコン */}
                <div className="sm:hidden">
                  <Link
                    to="/login"
                    className="p-2 text-indigo-600 hover:text-indigo-800"
                  >
                    <LogIn className="h-5 w-5" />
                  </Link>
                </div>
              </>
            )}

            {/* ハンバーガーメニューボタン */}
            <button
              onClick={toggleMobileMenu}
              className="ml-2 p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              aria-label="メインメニュー"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* モバイル用検索バー（トグル） */}
        {isSearchOpen && (
          <div className="md:hidden py-2 px-2 border-t border-gray-200">
            <SearchBar />
          </div>
        )}
      </div>

      {/* モバイルメニュー */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
}