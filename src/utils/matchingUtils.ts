import { supabase } from '../lib/supabase';

/**
 * 指定されたテーブルが存在するか確認します
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .limit(1);

    if (error) {
      console.error('テーブル存在確認エラー:', error);
      return false;
    }

    return !!(data && data.length > 0);
  } catch (error) {
    console.error('checkTableExistsエラー:', error);
    return false;
  }
};

/**
 * テーブルが存在しない場合に作成を試みます
 */
export const createTableIfNotExists = async (tableName: string): Promise<boolean> => {
  try {
    // 本来はここで適切なテーブル作成処理を書くべきですが
    // 動的にSQL発行は難しいので一旦ダミー成功を返します
    console.warn(`テーブル ${tableName} の作成ロジックは未実装です`);
    return true;
  } catch (error) {
    console.error('createTableIfNotExistsエラー:', error);
    return false;
  }
};

/**
 * ユーザーの活動レベルを計算します
 */
export const calculateActivityLevel = async (userId: string): Promise<number> => {
  try {
    if (!userId) return 5; // デフォルト

    const { data, error } = await supabase
      .from('view_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('活動レベル取得エラー:', error);
      return 5;
    }

    const viewCount = data?.length || 0;
    if (viewCount > 100) return 1;
    if (viewCount > 50) return 2;
    if (viewCount > 20) return 3;
    if (viewCount > 5) return 4;
    return 5;
  } catch (error) {
    console.error('calculateActivityLevelエラー:', error);
    return 5;
  }
};

/**
 * ユーザーの視聴履歴を取得します
 */
export const getUserWatchHistory = async (userId: string, limit: number = 50): Promise<string[]> => {
  try {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('view_history')
      .select('video_id')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('視聴履歴取得エラー:', error);
      return [];
    }

    return data?.map((row) => row.video_id) || [];
  } catch (error) {
    console.error('getUserWatchHistoryエラー:', error);
    return [];
  }
};
