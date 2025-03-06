// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

/**
 * 指定されたメディアクエリが一致するかどうかを追跡するカスタムフック
 * @param query メディアクエリ文字列（例：'(max-width: 768px)'）
 * @returns メディアクエリが一致するかどうかを示すブール値
 */
function useMediaQuery(query: string): boolean {
  // メディアクエリが一致するかどうかの状態
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // ブラウザがmatchMediaをサポートしているかを確認
    const mediaQueryList = window.matchMedia(query);
    
    // 初期状態を設定
    setMatches(mediaQueryList.matches);

    // イベントリスナーのコールバック関数
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // メディアクエリの変更を監視
    // 新しいブラウザではaddEventListenerを使用
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // 古いブラウザ（特にIE）向けのフォールバック
      mediaQueryList.addListener(handleChange);
    }

    // クリーンアップ関数
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;