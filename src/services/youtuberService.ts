// src/services/youtuberService.ts

import { supabase } from '../lib/supabase';

interface YoutuberProfile {
  id: string;
  channel_name: string;
  channel_url: string;
  channel_description?: string;
  verification_status: string;
  verified_at?: string | null;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

// プロファイル取得（userIdから）
export async function getYoutuberProfileByUserId(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('youtuber_profile_id')
    .eq('id', userId)
    .single();
  if (error) throw new Error('ユーザープロファイル取得失敗: ' + error.message);
  if (!data?.youtuber_profile_id) return null;

  const { data: profile, error: profileError } = await supabase
    .from('youtuber_profiles')
    .select('*')
    .eq('id', data.youtuber_profile_id)
    .single();
  if (profileError) throw new Error('YouTuberプロファイル取得失敗: ' + profileError.message);

  return profile;
}

// プロファイル取得（profileIdから）
export async function getYoutuberProfileById(profileId: string) {
  const { data, error } = await supabase
    .from('youtuber_profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  if (error) throw new Error('YouTuberプロファイル取得失敗: ' + error.message);
  return data;
}

// 新規プロファイル作成
export async function createYoutuberProfile(userId: string, profileData: Partial<YoutuberProfile>) {
  const { data, error } = await supabase
    .from('youtuber_profiles')
    .insert({
      channel_name: profileData.channel_name || 'Unnamed Channel',
      channel_url: profileData.channel_url || '',
      channel_description: profileData.channel_description || '',
      verification_status: 'pending',
      category: profileData.category || 'other'
    })
    .select('id')
    .single();
  if (error) throw new Error('YouTuberプロファイル作成失敗: ' + error.message);

  const { error: linkError } = await supabase
    .from('profiles')
    .update({ youtuber_profile_id: data.id })
    .eq('id', userId);
  if (linkError) throw new Error('ユーザープロファイル更新失敗: ' + linkError.message);

  return data;
}

// プロファイル更新
export async function updateYoutuberProfile(profileId: string, profileData: Partial<YoutuberProfile>) {
  const { data, error } = await supabase
    .from('youtuber_profiles')
    .update({ ...profileData, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw new Error('YouTuberプロファイル更新失敗: ' + error.message);

  return data;
}

// プロファイル存在チェック
export async function hasYoutuberProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('youtuber_profile_id')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('YouTuberプロファイル確認エラー:', error.message);
    return false;
  }
  return !!data?.youtuber_profile_id;
}
