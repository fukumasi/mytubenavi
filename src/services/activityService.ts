// src/services/activityService.ts

/**
 * 仮実装：ユーザー活動レベルを計算する
 * （本来はSupabaseなどのデータベースから算出するべきだが、今は仮対応）
 *
 * @param userId - 活動レベルを計算したいユーザーID
 * @returns ランダムな活動レベル（1～5）
 */
export async function calculateActivityLevel(userId: string): Promise<number> {
  console.log(`(仮実装) calculateActivityLevel called for userId: ${userId}`);
  return Math.floor(Math.random() * 5) + 1; // 1〜5のランダムな数値を返す
}
