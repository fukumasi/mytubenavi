// src/components/layout/Header.tsx
import { useState, useEffect, useRef } from 'react';
import { LogIn, UserPlus, Youtube, User, Menu, Search, Crown, Users, MessageCircle, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/search/SearchBar';
import NotificationBell from '@/components/layout/NotificationBell';
import NotificationSound from '@/components/layout/NotificationSound';
import MobileMenu from '@/components/ui/MobileMenu';
import { useMessaging } from '@/hooks/useMessaging';
import { useTheme } from '@/contexts/ThemeContext'; // テーマコンテキストをインポート

export default function Header() {
 const { user, signOut, loading: authLoading, isPremium } = useAuth();
 const { unreadCount } = useNotifications();
 const { unreadMessageCount } = useMessaging();
 const { theme, toggleTheme } = useTheme(); // テーマコンテキストを使用
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
         console.error('Error fetching profile:', error);
       }
     }
     setLoading(false);
   };

   if (!authLoading) {
     fetchUserProfile();
   }
 }, [user, authLoading]);

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
     await signOut(); // signOut関数を呼び出し
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

 // マッチングリンク先の決定 - プレミアムユーザーは /premium/matching へ
 const matchingPath = isPremium ? "/premium/matching" : "/matching";
 // メッセージングリンク - /messaging から /messages に修正
 const messagingPath = "/messages";

 return (
   <header className="fixed top-0 left-0 right-0 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border z-50">
     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <div className="flex justify-between items-center h-16">
         <div className="flex items-center">
           <Link to="/" className="flex items-center">
             <h1 className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">MyTubeNavi</h1>
           </Link>
           
           {/* デスクトップ用ナビゲーションリンク */}
           <div className="hidden md:flex items-center ml-6 space-x-4">
             <Link to="/genres" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
               ジャンル
             </Link>
             <Link to={matchingPath} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
               <Users className="h-4 w-4 mr-1" />
               マッチング
             </Link>
             {user && (
               <Link to={messagingPath} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 relative">
                 <MessageCircle className="h-4 w-4 mr-1" />
                 メッセージ
                 {unreadMessageCount > 0 && (
                   <span className="absolute -top-2 -right-2 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                     {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                   </span>
                 )}
               </Link>
             )}
           </div>
         </div>

         {/* デスクトップ用検索バー - 常に表示 */}
         <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-8">
           <SearchBar />
         </div>

         {/* モバイル用検索アイコン - 常に表示 */}
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
           {/* テーマ切り替えボタン */}
           <button
             onClick={toggleTheme}
             className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-border focus:outline-none focus:ring-2 focus:ring-indigo-500"
             aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
           >
             {theme === 'dark' ? (
               <Sun className="h-5 w-5 text-yellow-300" />
             ) : (
               <Moon className="h-5 w-5" />
             )}
           </button>

           {authLoading || loading ? (
             <div className="animate-pulse">
               <div className="h-8 w-20 bg-gray-200 dark:bg-dark-border rounded"></div>
             </div>
           ) : user ? (
             <>
               <div className="hidden sm:block">
                 <NotificationBell />
               </div>
               {/* メッセージアイコン（モバイル用） */}
               <div className="sm:hidden">
                 <Link to={messagingPath} className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 relative">
                   <MessageCircle className="h-5 w-5" />
                   {unreadMessageCount > 0 && (
                     <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                       {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                     </span>
                   )}
                 </Link>
               </div>
               <NotificationSound />
               <div className="relative" ref={userMenuRef}>
                 <button
                   onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                   className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white relative"
                 >
                   <div className="w-8 h-8 bg-gray-100 dark:bg-dark-border rounded-full flex items-center justify-center overflow-hidden">
                     {avatarUrl ? (
                       <img
                         src={avatarUrl}
                         alt="Profile"
                         className="w-full h-full object-cover"
                       />
                     ) : (
                       <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                     )}
                   </div>
                   <span className="hidden sm:block">
                     {username || user.email?.split('@')[0]}
                   </span>
                   {isPremium && (
                     <span className="absolute -top-1 -right-1">
                       <Crown className="h-4 w-4 text-yellow-500" />
                     </span>
                   )}
                   {unreadCount > 0 && (
                     <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                       {unreadCount > 9 ? '9+' : unreadCount}
                     </span>
                   )}
                 </button>

                 {isUserMenuOpen && (
                   <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface rounded-md shadow-lg py-1 border border-gray-200 dark:border-dark-border z-10">
                     <Link
                       to="/profile"
                       className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
                       onClick={() => setIsUserMenuOpen(false)}
                     >
                       プロフィール
                     </Link>
                     <Link
                       to="/profile/notifications"
                       className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
                       onClick={() => setIsUserMenuOpen(false)}
                     >
                       <span>通知</span>
                       {unreadCount > 0 && (
                         <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium px-2 py-0.5 rounded-full">
                           {unreadCount}
                         </span>
                       )}
                     </Link>
                     <Link
                       to={matchingPath}
                       className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
                       onClick={() => setIsUserMenuOpen(false)}
                     >
                       <Users className="h-4 w-4 text-indigo-500 dark:text-indigo-400 mr-1.5" />
                       マッチング
                     </Link>
                     <Link
                       to={messagingPath}
                       className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
                       onClick={() => setIsUserMenuOpen(false)}
                     >
                       <div className="flex items-center">
                         <MessageCircle className="h-4 w-4 text-indigo-500 dark:text-indigo-400 mr-1.5" />
                         <span>メッセージ</span>
                       </div>
                       {unreadMessageCount > 0 && (
                         <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium px-2 py-0.5 rounded-full">
                           {unreadMessageCount}
                         </span>
                       )}
                     </Link>
                     
                     {isPremium ? (
                       <Link
                         to="/premium"
                         className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
                         onClick={() => setIsUserMenuOpen(false)}
                       >
                         <Crown className="h-4 w-4 text-yellow-500 mr-1.5" />
                         プレミアム
                       </Link>
                     ) : (
                       <Link
                         to="/premium"
                         className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
                         onClick={() => setIsUserMenuOpen(false)}
                       >
                         <Crown className="h-4 w-4 text-gray-400 mr-1.5" />
                         プレミアム登録
                       </Link>
                     )}
                     
                     {/* テーマ切り替えメニュー項目 */}
                     <button
                       onClick={() => {
                         toggleTheme();
                         setIsUserMenuOpen(false);
                       }}
                       className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
                     >
                       {theme === 'dark' ? (
                         <>
                           <Sun className="h-4 w-4 text-yellow-500 mr-1.5" />
                           ライトモード
                         </>
                       ) : (
                         <>
                           <Moon className="h-4 w-4 text-gray-600 mr-1.5" />
                           ダークモード
                         </>
                       )}
                     </button>
                     
                     <button
                       onClick={handleLogout}
                       className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
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
                   className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-dark-surface"
                 >
                   <LogIn className="h-4 w-4 mr-1" />
                   ログイン
                 </Link>
                 <Link
                   to="/signup"
                   className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-dark-surface"
                 >
                   <UserPlus className="h-4 w-4 mr-1" />
                   新規登録
                 </Link>
                 <Link
                   to="/youtuber/register"
                   className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-dark-surface"
                 >
                   <Youtube className="h-4 w-4 mr-1" />
                   YouTuber
                 </Link>
               </div>

               {/* モバイル用簡易ログインアイコン */}
               <div className="sm:hidden">
                 <Link
                   to="/login"
                   className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                 >
                   <LogIn className="h-5 w-5" />
                 </Link>
               </div>
             </>
           )}

           {/* ハンバーガーメニューボタン */}
           <button
             onClick={toggleMobileMenu}
             className="ml-2 p-2 rounded-md text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-border focus:outline-none"
             aria-label="メインメニュー"
           >
             <Menu className="h-5 w-5" />
           </button>
         </div>
       </div>

       {/* モバイル用検索バー（トグル） */}
       {isSearchOpen && (
         <div className="md:hidden py-2 px-2 border-t border-gray-200 dark:border-dark-border">
           <SearchBar />
         </div>
       )}
     </div>

     {/* モバイルメニュー */}
     <MobileMenu 
       isOpen={isMobileMenuOpen} 
       onClose={() => setIsMobileMenuOpen(false)} 
       isPremium={isPremium}
     />
   </header>
 );
}