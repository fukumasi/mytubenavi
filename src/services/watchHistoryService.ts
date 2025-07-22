// src/services/watchHistoryService.ts

/**
 * 仮実装：ユーザーの視聴履歴を取得する
 * （本来はSupabaseやDBから取得するべきだが、今は仮対応）
 *
 * @param userId - 視聴履歴を取得したいユーザーID
 * @param limit - 最大取得件数
 * @returns ダミーの動画ID配列
 */
export async function getUserWatchHistory(userId: string, limit: number = 50): Promise<string[]> {
  console.log(`(仮実装) getUserWatchHistory called for userId: ${userId}, limit: ${limit}`);
  
  // 仮にダミー動画IDを返す
  const dummyVideoIds = Array.from({ length: limit }, (_, i) => `video_${i + 1}`);
  return dummyVideoIds;
}
