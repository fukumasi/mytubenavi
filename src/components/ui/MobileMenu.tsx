// src/components/ui/MobileMenu.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
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
        className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${menuClasses}`}
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
                  className="block px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                  onClick={handleMenuItemClick}
                >
                  ホーム
                </Link>
              </li>
              <li>
                <Link 
                  to="/search"
                  className="block px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                  onClick={handleMenuItemClick}
                >
                  検索
                </Link>
              </li>
              
              {/* 認証状態に応じた項目の表示 */}
              {user ? (
                <>
                  <li>
                    <Link 
                      to="/profile"
                      className="block px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      onClick={handleMenuItemClick}
                    >
                      プロフィール
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/favorites"
                      className="block px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      onClick={handleMenuItemClick}
                    >
                      お気に入り
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/notifications"
                      className="block px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      onClick={handleMenuItemClick}
                    >
                      通知
                    </Link>
                  </li>
                  {/* YouTuber向けのリンク */}
                  <li>
                    <Link 
                      to="/youtuber/dashboard"
                      className="block px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      onClick={handleMenuItemClick}
                    >
                      YouTuberダッシュボード
                    </Link>
                  </li>
                  <li>
                    <button 
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                    >
                      ログアウト
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link 
                      to="/login"
                      className="block px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      onClick={handleMenuItemClick}
                    >
                      ログイン
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/signup"
                      className="block px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      onClick={handleMenuItemClick}
                    >
                      新規登録
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