// src/services/matching/skipService.ts

import { supabase } from '@/lib/supabase';
import { checkTableExists, createTableIfNotExists } from './tableUtils';
import { SkippedUser } from '@/types/matching';
import { OnlineStatus, ConnectionStatus } from '@/types/matching'; 

// ProfileRow型の定義（適宜変更）
export interface ProfileRow {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string;
  birth_date?: string | null;
  online_status?: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
  interests?: string[];  // interests プロパティを追加
  is_premium?: boolean;  // is_premium プロパティを追加
  gender?: string;       // gender プロパティを追加
}

/**
 * ユーザーをスキップする
 */
export const skipUser = async (userId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!userId || !targetUserId) {
      return { success: false, error: 'ユーザーIDが不足しています' };
    }
    if (userId === targetUserId) {
      return { success: false, error: '自分をスキップできません' };
    }

    await checkTableExists('user_skips') || await createTableIfNotExists('user_skips');

    // 既にスキップ済みかチェック
    const { data: existing } = await supabase
      .from('user_skips')
      .select('user_id')
      .eq('user_id', userId)
      .eq('skipped_user_id', targetUserId)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: true };
    }

    await supabase.from('user_skips').insert({
      user_id: userId,
      skipped_user_id: targetUserId,
      created_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('skipUserエラー:', error);
    return { success: false, error: 'スキップ処理に失敗しました' };
  }
};

/**
 * スキップを取り消す
 */
export const undoSkip = async (userId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!userId || !targetUserId) {
      return { success: false, error: 'ユーザーIDが不足しています' };
    }

    await checkTableExists('user_skips') || await createTableIfNotExists('user_skips');

    await supabase
      .from('user_skips')
      .delete()
      .eq('user_id', userId)
      .eq('skipped_user_id', targetUserId);

    return { success: true };
  } catch (error) {
    console.error('undoSkipエラー:', error);
    return { success: false, error: 'スキップ取り消しに失敗しました' };
  }
};

/**
 * スキップしたユーザー一覧を取得する
 */
export const getSkippedUsers = async (userId: string, limit: number = 10): Promise<SkippedUser[]> => {
  try {
    if (!userId) throw new Error('ユーザーIDが指定されていません');

    await checkTableExists('user_skips') || await createTableIfNotExists('user_skips');
    await checkTableExists('profiles') || await createTableIfNotExists('profiles');

    const { data: skippedData } = await supabase
      .from('user_skips')
      .select('skipped_user_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!skippedData || skippedData.length === 0) return [];

    const skippedIds = skippedData.map((s: any) => s.skipped_user_id);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, birth_date, online_status, interests, is_premium, gender')
      .in('id', skippedIds);

    if (!profileData) return [];

    return profileData.map((profile: ProfileRow) => {
      const skipInfo = skippedData.find((skip: any) => skip.skipped_user_id === profile.id);
      const age = profile.birth_date ? calculateAge(profile.birth_date) : null;
      return {
        ...profile,
        bio: profile.bio ?? '',
        skipped_at: skipInfo?.created_at || new Date().toISOString(),
        age,
        matching_score: 0,
        common_interests: profile.interests || [],
        online_status: (profile.online_status as OnlineStatus) || OnlineStatus.OFFLINE,
        connection_status: ConnectionStatus.NONE,
        is_premium: profile.is_premium || false,
        gender: profile.gender || 'unknown', // genderの追加
      } as SkippedUser;
    }).sort((a, b) => new Date(b.skipped_at).getTime() - new Date(a.skipped_at).getTime());
  } catch (error) {
    console.error('getSkippedUsersエラー:', error);
    return [];
  }
};

/**
 * 生年月日から年齢を計算する
 */
const calculateAge = (birthDateStr: string): number => {
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || 
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};
