// src/hooks/useWindowSize.ts
import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

/**
 * ウィンドウサイズを監視するカスタムフック
 * @returns 現在のウィンドウの幅と高さを含むオブジェクト
 */
function useWindowSize(): WindowSize {
  // ウィンドウサイズの初期値を設定
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    // ウィンドウのリサイズを処理する関数
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // イベントリスナーを追加
    window.addEventListener('resize', handleResize);
    
    // 初期値を設定
    handleResize();

    // クリーンアップ関数
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

export default useWindowSize;