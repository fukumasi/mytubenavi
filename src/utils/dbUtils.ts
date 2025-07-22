import { supabase } from '../lib/supabase';

/**
 * 指定されたテーブルが存在するか確認する
 * @param tableName - 確認するテーブル名
 * @returns 存在すればtrue、存在しなければfalse
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(1);
    if (error && (error.code === '42P01' || error.code === 'PGRST116')) {
      return false;
    }
    return true;
  } catch (error) {
    console.error(`テーブル存在確認エラー (${tableName}):`, error);
    return false;
  }
};

/**
 * 指定されたテーブルが存在しなければ作成を試みる
 * @param tableName - 作成するテーブル名
 * @returns 作成成功すればtrue、失敗すればfalse
 */
export const createTableIfNotExists = async (tableName: string): Promise<boolean> => {
  console.warn(`createTableIfNotExistsは仮実装です。Supabase側で自動管理を推奨します: ${tableName}`);
  // 本来はSupabase SQLエディタや管理画面でテーブルを作成しておくべきです
  return false;
};
