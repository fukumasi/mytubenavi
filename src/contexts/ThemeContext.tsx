import React, { createContext, useState, useContext, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// テーマコンテキストの作成
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// テーマプロバイダーコンポーネント
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ローカルストレージからテーマ設定を取得するか、デフォルトで'light'を使用
  const [theme, setTheme] = useState<Theme>(() => {
    // ブラウザ環境であればローカルストレージから取得
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      return savedTheme || 'light';
    }
    return 'light';
  });

  // テーマを切り替える関数
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // テーマが変更されたらローカルストレージに保存し、HTML要素のclassを更新
  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    // HTML要素のclassリストにdarkを追加または削除
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [theme]);

  // コンテキスト値の提供
  const value = { theme, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// カスタムフック：テーマコンテキストを使用するため
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};