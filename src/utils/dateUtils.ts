// src/utils/dateUtils.ts

/**
 * 日付文字列を日本の形式（YYYY/MM/DD）に変換する
 * @param dateString ISO形式の日付文字列またはDate型
 * @returns フォーマットされた日付文字列
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '未設定';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // 無効な日付の場合
  if (isNaN(date.getTime())) return '無効な日付';
  
  // YYYY/MM/DD形式にフォーマット
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '/');
}

/**
 * 日付の差分を日数で計算する
 * @param startDate 開始日
 * @param endDate 終了日
 * @returns 日数
 */
export function calculateDaysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // 時間部分を無視して日付だけを比較するために時刻をリセット
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // ミリ秒の差分を日数に変換
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 終了日も含むため+1
}