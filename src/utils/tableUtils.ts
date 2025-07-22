// src/utils/tableUtils.ts

import { supabase } from '@/lib/supabase';

/**
 * 指定されたテーブルが存在するか確認します。
 * @param tableName - 確認するテーブル名
 * @returns テーブルが存在する場合はtrue、存在しない場合はfalse
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST116') {
        // テーブルが存在しない場合
        return false;
      }
      console.error(`テーブル ${tableName} の存在確認中にエラー:`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`テーブル ${tableName} の存在確認例外:`, e);
    return false;
  }
};

/**
 * 指定されたテーブルが存在しない場合に作成を試みます。
 * （この関数自体は汎用的。具体的なCREATE文は別途定義が必要）
 * @param tableName - 作成を試みるテーブル名
 * @returns 作成できたかどうか
 */
export const createTableIfNotExists = async (tableName: string): Promise<boolean> => {
  try {
    console.warn(`テーブル ${tableName} が存在しないため、作成ロジックを実装してください。`);
    // ★ここでは "create" まで行いません（安全設計）
    // Supabase SQLエディターやマイグレーション管理に任せる設計が基本です
    return false;
  } catch (e) {
    console.error(`テーブル ${tableName} の作成試行中に例外発生:`, e);
    return false;
  }
};
