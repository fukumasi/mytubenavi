/**
 * 生年月日から年齢を計算する
 * @param birthDate - 生年月日（ISO形式文字列）
 * @returns 年齢（計算できない場合はnull）
 */
export const calculateAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch (error) {
    console.error('年齢計算エラー:', error);
    return null;
  }
};

/**
 * 2つの配列の共通要素を抽出する
 * @param arr1 - 配列1
 * @param arr2 - 配列2
 * @returns 共通要素の配列
 */
export const calculateCommonElements = <T>(arr1: T[], arr2: T[]): T[] => {
  const set2 = new Set(arr2);
  return arr1.filter(item => set2.has(item));
};
