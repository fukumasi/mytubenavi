import { supabase } from '@/lib/supabase';

/**
 * テーブルが存在するかチェックする
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    if (!tableName) return false;

    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST116') {
        // テーブルが存在しないエラー
        return false;
      }
      console.error(`テーブル存在チェックエラー (${tableName}):`, error);
    }
    return true;
  } catch (error) {
    console.error(`checkTableExistsエラー (${tableName}):`, error);
    return false;
  }
};

/**
 * テーブルを作成する（存在しない場合のみ）
 * ※ 本番ではSupabaseダッシュボード管理推奨
 */
export const createTableIfNotExists = async (tableName: string): Promise<boolean> => {
  try {
    if (!tableName) return false;

    console.warn(`テーブル ${tableName} は存在しないため、手動作成が必要です`);
    // 本来ここでsupabase.rpc()等で自動作成できる場合もあるが、通常はダッシュボード作成
    return false;
  } catch (error) {
    console.error(`createTableIfNotExistsエラー (${tableName}):`, error);
    return false;
  }
};
