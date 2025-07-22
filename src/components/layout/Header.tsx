
import { useState, useEffect, useRef } from 'react';
import { LogIn, UserPlus, Youtube, User, Menu, Search, Crown, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/search/SearchBar';
import NotificationBell from '@/components/layout/NotificationBell';
import NotificationSound from '@/components/layout/NotificationSound';
import MobileMenu from '@/components/ui/MobileMenu';
import { useTheme } from '@/contexts/ThemeContext';

export default function Header() {
  const { user, signOut, loading: authLoading, isPremium } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('avatar_url, username')
            .eq('id', user.id)
            .single();
          if (error) throw error;
          if (profile) {
            setAvatarUrl(profile.avatar_url);
            setUsername(profile.username);
          }
        } catch (error) {
          console.error('プロフィール取得エラー:', error);
        }
      }
      setLoading(false);
    };
    if (!authLoading) {
      fetchUserProfile();
    }
  }, [user, authLoading]);

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
  }, []);

  const handleLogout = async () => {
    try {
      setIsUserMenuOpen(false);
      await signOut();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleSearch = () => setIsSearchOpen(!isSearchOpen);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">MyTubeNavi</h1>
            </Link>
          </div>

          <div className="hidden md:flex flex-1 justify-center mx-8">
            <SearchBar />
          </div>

          <div className="md:hidden flex items-center mr-2">
            <button
              onClick={toggleSearch}
              className={`p-2 rounded-full ${isSearchOpen ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-border'}`}
              aria-label="検索"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-border"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-300" /> : <Moon className="h-5 w-5" />}
            </button>

            {authLoading || loading ? (
              <div className="animate-pulse">
                <div className="h-8 w-20 bg-gray-200 dark:bg-dark-border rounded" />
              </div>
            ) : user ? (
              <>
                <div className="hidden sm:block">
                  <NotificationBell />
                </div>
                <NotificationSound />

                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <div className="w-8 h-8 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <span className="hidden sm:block">{username || user.email?.split('@')[0]}</span>
                    {isPremium && <Crown className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1" />}
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface rounded-md shadow-lg border border-gray-200 dark:border-dark-border">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        プロフィール
                      </Link>
                      <Link
                        to="/premium"
                        className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {isPremium ? 'プレミアム' : 'プレミアム登録'}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                      >
                        ログアウト
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="hidden sm:flex items-center space-x-2">
                  <Link to="/login" className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    <LogIn className="h-4 w-4 mr-1" /> ログイン
                  </Link>
                  <Link to="/signup" className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
                    <UserPlus className="h-4 w-4 mr-1" /> 新規登録
                  </Link>
                  <Link to="/youtuber/register" className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    <Youtube className="h-4 w-4 mr-1" /> YouTuber
                  </Link>
                </div>
                <div className="sm:hidden">
                  <Link to="/login" className="p-2 text-indigo-600">
                    <LogIn className="h-5 w-5" />
                  </Link>
                </div>
              </>
            )}
            <button onClick={toggleMobileMenu} className="ml-2 p-2 rounded-md text-gray-500 hover:text-gray-900">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isSearchOpen && (
          <div className="md:hidden py-2 px-2 border-t">
            <SearchBar />
          </div>
        )}
      </div>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} isPremium={isPremium} />
    </header>
  );
}
