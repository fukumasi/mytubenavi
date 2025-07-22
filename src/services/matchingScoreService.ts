// src/services/matchingScoreService.ts

/**
 * 仮実装：マッチングスコアを計算する
 * 
 * 本来は、興味関心・ジャンル・視聴履歴・活動レベル・プレミアムステータスなどを
 * 詳細に比較してスコアリングするべきですが、
 * 今は仮対応としてランダムなスコアを返します。
 *
 * @returns 0〜100のランダムなマッチングスコア
 */
export function calculateMatchingScore(
  _userInterests: string[],
  _candidateInterests: string[],
  _userGenres: string[],
  _candidateGenres: string[],
  _userWatchHistory: string[],
  _candidateWatchHistory: string[],
  _userActivityLevel: number,
  _candidateActivityLevel: number,
  _userIsPremium: boolean,
  _candidateIsPremium: boolean
): number {
  console.log('(仮実装) calculateMatchingScore called');

  // 仮にランダムなマッチングスコアを返す
  return Math.floor(Math.random() * 101); // 0〜100の間の整数
}
