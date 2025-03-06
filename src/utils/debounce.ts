// src/utils/debounce.ts
/**
 * 関数の実行を遅延させるdebounce関数
 * @param func 実行する関数
 * @param wait 遅延時間（ミリ秒）
 * @returns debounceされた関数
 */
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

export default debounce;