// src/components/ui/MobileMenu.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Sparkles, ThumbsUp, Bell, Home, Search, User, Heart, Youtube, LogOut, Users, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext'; // テーマコンテキストをインポート

interface MobileMenuProps {
 isOpen: boolean;
 onClose: () => void;
 isPremium?: boolean;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, isPremium = false }) => {
 const { user, signOut } = useAuth();
 const { theme, toggleTheme } = useTheme(); // テーマコンテキストを使用
 const [menuClasses, setMenuClasses] = useState('translate-x-full');

 // マッチングリンク先の決定 - プレミアムユーザーは /premium/matching へ
 const matchingPath = isPremium ? "/premium/matching" : "/matching";

 // メニューの開閉状態が変わったときにアニメーションクラスを更新
 useEffect(() => {
   if (isOpen) {
     setMenuClasses('translate-x-0');
   } else {
     setMenuClasses('translate-x-full');
   }
 }, [isOpen]);

 // メニュー項目をクリックしたときの処理
 const handleMenuItemClick = () => {
   onClose();
 };

 // サインアウト処理
 const handleSignOut = async () => {
   try {
     await signOut();
     onClose();
   } catch (error) {
     console.error('サインアウトエラー:', error);
   }
 };

 // テーマを切り替える関数
 const handleThemeToggle = () => {
   toggleTheme();
 };

 return (
   <>
     {/* オーバーレイ（メニューの背景） */}
     {isOpen && (
       <div 
         className="fixed inset-0 bg-black bg-opacity-50 z-40"
         onClick={onClose}
       />
     )}

     {/* モバイルメニュー */}
     <div 
       className={`fixed top-0 right-0 h-full w-72 bg-white dark:bg-dark-surface shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${menuClasses}`}
     >
       <div className="flex flex-col h-full">
         {/* メニューヘッダー */}
         <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
           <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary">メニュー</h2>
           <button 
             onClick={onClose}
             className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
         </div>

         {/* メニュー項目 */}
         <nav className="flex-1 overflow-y-auto p-4">
           <ul className="space-y-2">
             <li>
               <Link 
                 to="/"
                 className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                 onClick={handleMenuItemClick}
               >
                 <Home className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                 ホーム
               </Link>
             </li>
             <li>
               <Link 
                 to="/search"
                 className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                 onClick={handleMenuItemClick}
               >
                 <Search className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                 検索
               </Link>
             </li>
             
             {/* マッチング機能へのリンク */}
             <li>
               <Link 
                 to={matchingPath}
                 className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                 onClick={handleMenuItemClick}
               >
                 <Users className="h-5 w-5 mr-3 text-indigo-500 dark:text-indigo-400" />
                 マッチング
               </Link>
             </li>
             
             {/* テーマ切り替えボタン */}
             <li>
               <button
                 onClick={handleThemeToggle}
                 className="flex items-center w-full text-left px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
               >
                 {theme === 'dark' ? (
                   <>
                     <Sun className="h-5 w-5 mr-3 text-yellow-500" />
                     ライトモードに切り替え
                   </>
                 ) : (
                   <>
                     <Moon className="h-5 w-5 mr-3 text-gray-500" />
                     ダークモードに切り替え
                   </>
                 )}
               </button>
             </li>
             
             {/* 認証状態に応じた項目の表示 */}
             {user ? (
               <>
                 {/* プレミアム会員メニュー */}
                 {isPremium ? (
                   <li>
                     <Link 
                       to="/premium"
                       className="flex items-center px-4 py-2 rounded-md bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 text-gray-800 dark:text-yellow-100"
                       onClick={handleMenuItemClick}
                     >
                       <Crown className="h-5 w-5 mr-3 text-yellow-500" />
                       プレミアムダッシュボード
                     </Link>
                   </li>
                 ) : (
                   <li>
                     <Link 
                       to="/premium"
                       className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                       onClick={handleMenuItemClick}
                     >
                       <Sparkles className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                       プレミアム会員登録
                     </Link>
                   </li>
                 )}

                 <li className="mt-4">
                   <Link 
                     to="/profile"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                     onClick={handleMenuItemClick}
                   >
                     <User className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                     プロフィール
                   </Link>
                 </li>
                 <li>
                   <Link 
                     to="/profile/favorites"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                     onClick={handleMenuItemClick}
                   >
                     <Heart className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                     お気に入り
                   </Link>
                 </li>
                 <li>
                   <Link 
                     to="/profile/notifications"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                     onClick={handleMenuItemClick}
                   >
                     <Bell className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                     通知
                   </Link>
                 </li>
                 <li>
                   <Link 
                     to="/profile/ratings"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                     onClick={handleMenuItemClick}
                   >
                     <ThumbsUp className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                     評価した動画
                   </Link>
                 </li>
                 
                 {/* YouTuber向けのリンク */}
                 <li className="pt-3 mt-3 border-t border-gray-200 dark:border-dark-border">
                   <Link 
                     to="/youtuber/dashboard"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                     onClick={handleMenuItemClick}
                   >
                     <Youtube className="h-5 w-5 mr-3 text-red-500" />
                     YouTuberダッシュボード
                   </Link>
                 </li>
                 
                 <li className="pt-3 mt-3 border-t border-gray-200 dark:border-dark-border">
                   <button 
                     onClick={handleSignOut}
                     className="flex items-center w-full text-left px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                   >
                     <LogOut className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                     ログアウト
                   </button>
                 </li>
               </>
             ) : (
               <>
                 <li className="pt-3 mt-3 border-t border-gray-200 dark:border-dark-border">
                   <Link 
                     to="/login"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                     onClick={handleMenuItemClick}
                   >
                     <User className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                     ログイン
                   </Link>
                 </li>
                 <li>
                   <Link 
                     to="/signup"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text-primary"
                     onClick={handleMenuItemClick}
                   >
                     <Sparkles className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                     新規登録
                   </Link>
                 </li>
                 <li className="pt-3 mt-3 border-t border-gray-200 dark:border-dark-border">
                   <Link 
                     to="/youtuber/register"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border text-red-600 dark:text-red-400"
                     onClick={handleMenuItemClick}
                   >
                     <Youtube className="h-5 w-5 mr-3 text-red-600 dark:text-red-400" />
                     YouTuber登録
                   </Link>
                 </li>
               </>
             )}
           </ul>
         </nav>

         {/* メニューフッター */}
         <div className="p-4 border-t border-gray-200 dark:border-dark-border">
           <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
             © {new Date().getFullYear()} MyTubeNavi
           </div>
         </div>
       </div>
     </div>
   </>
 );
};

export default MobileMenu;