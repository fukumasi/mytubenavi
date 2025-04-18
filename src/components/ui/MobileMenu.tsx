// src/components/ui/MobileMenu.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Sparkles, ThumbsUp, Bell, Home, Search, User, Heart, Youtube, LogOut, Users } from 'lucide-react';

interface MobileMenuProps {
 isOpen: boolean;
 onClose: () => void;
 isPremium?: boolean;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, isPremium = false }) => {
 const { user, signOut } = useAuth();
 const [menuClasses, setMenuClasses] = useState('translate-x-full');

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
       className={`fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${menuClasses}`}
     >
       <div className="flex flex-col h-full">
         {/* メニューヘッダー */}
         <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
           <h2 className="text-lg font-semibold dark:text-white">メニュー</h2>
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
                 className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                 onClick={handleMenuItemClick}
               >
                 <Home className="h-5 w-5 mr-3 text-gray-500" />
                 ホーム
               </Link>
             </li>
             <li>
               <Link 
                 to="/search"
                 className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                 onClick={handleMenuItemClick}
               >
                 <Search className="h-5 w-5 mr-3 text-gray-500" />
                 検索
               </Link>
             </li>
             
             {/* マッチング機能へのリンク */}
             <li>
               <Link 
                 to="/matching"
                 className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                 onClick={handleMenuItemClick}
               >
                 <Users className="h-5 w-5 mr-3 text-indigo-500" />
                 マッチング
               </Link>
             </li>
             
             {/* 認証状態に応じた項目の表示 */}
             {user ? (
               <>
                 {/* プレミアム会員メニュー */}
                 {isPremium ? (
                   <li>
                     <Link 
                       to="/premium"
                       className="flex items-center px-4 py-2 rounded-md bg-yellow-50 hover:bg-yellow-100 text-gray-800"
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
                       className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                       onClick={handleMenuItemClick}
                     >
                       <Sparkles className="h-5 w-5 mr-3 text-gray-500" />
                       プレミアム会員登録
                     </Link>
                   </li>
                 )}

                 <li className="mt-4">
                   <Link 
                     to="/profile"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                     onClick={handleMenuItemClick}
                   >
                     <User className="h-5 w-5 mr-3 text-gray-500" />
                     プロフィール
                   </Link>
                 </li>
                 <li>
                   <Link 
                     to="/profile/favorites"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                     onClick={handleMenuItemClick}
                   >
                     <Heart className="h-5 w-5 mr-3 text-gray-500" />
                     お気に入り
                   </Link>
                 </li>
                 <li>
                   <Link 
                     to="/profile/notifications"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                     onClick={handleMenuItemClick}
                   >
                     <Bell className="h-5 w-5 mr-3 text-gray-500" />
                     通知
                   </Link>
                 </li>
                 <li>
                   <Link 
                     to="/profile/ratings"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                     onClick={handleMenuItemClick}
                   >
                     <ThumbsUp className="h-5 w-5 mr-3 text-gray-500" />
                     評価した動画
                   </Link>
                 </li>
                 
                 {/* YouTuber向けのリンク */}
                 <li className="pt-3 mt-3 border-t border-gray-200">
                   <Link 
                     to="/youtuber/dashboard"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                     onClick={handleMenuItemClick}
                   >
                     <Youtube className="h-5 w-5 mr-3 text-red-500" />
                     YouTuberダッシュボード
                   </Link>
                 </li>
                 
                 <li className="pt-3 mt-3 border-t border-gray-200">
                   <button 
                     onClick={handleSignOut}
                     className="flex items-center w-full text-left px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                   >
                     <LogOut className="h-5 w-5 mr-3 text-gray-500" />
                     ログアウト
                   </button>
                 </li>
               </>
             ) : (
               <>
                 <li className="pt-3 mt-3 border-t border-gray-200">
                   <Link 
                     to="/login"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                     onClick={handleMenuItemClick}
                   >
                     <User className="h-5 w-5 mr-3 text-gray-500" />
                     ログイン
                   </Link>
                 </li>
                 <li>
                   <Link 
                     to="/signup"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                     onClick={handleMenuItemClick}
                   >
                     <Sparkles className="h-5 w-5 mr-3 text-gray-500" />
                     新規登録
                   </Link>
                 </li>
                 <li className="pt-3 mt-3 border-t border-gray-200">
                   <Link 
                     to="/youtuber/register"
                     className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white text-red-600"
                     onClick={handleMenuItemClick}
                   >
                     <Youtube className="h-5 w-5 mr-3 text-red-600" />
                     YouTuber登録
                   </Link>
                 </li>
               </>
             )}
           </ul>
         </nav>

         {/* メニューフッター */}
         <div className="p-4 border-t dark:border-gray-700">
           <div className="text-sm text-gray-500 dark:text-gray-400">
             © {new Date().getFullYear()} MyTubeNavi
           </div>
         </div>
       </div>
     </div>
   </>
 );
};

export default MobileMenu;