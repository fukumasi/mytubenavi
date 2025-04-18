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

// ユーザーIDからYouTuberプロファイルを取得
export async function getYoutuberProfileByUserId(userId: string) {
  try {
    // まずprofilesテーブルからユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('youtuber_profile_id')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    // YouTuberプロファイルIDがない場合はnullを返す
    if (!userData?.youtuber_profile_id) return null;
    
    // YouTuberプロファイルを取得
    const { data: youtuberData, error: youtuberError } = await supabase
      .from('youtuber_profiles')
      .select('*')
      .eq('id', userData.youtuber_profile_id)
      .single();
    
    if (youtuberError) throw youtuberError;
    
    return youtuberData;
  } catch (error) {
    console.error('YouTuberプロファイル取得エラー:', error);
    throw error;
  }
}

// YouTuberプロファイルを直接IDで取得
export async function getYoutuberProfileById(profileId: string) {
  try {
    const { data, error } = await supabase
      .from('youtuber_profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('YouTuberプロファイル取得エラー:', error);
    throw error;
  }
}

// 新しいYouTuberプロファイルを作成
export async function createYoutuberProfile(userId: string, profileData: Partial<YoutuberProfile>) {
  try {
    // 新しいYouTuberプロファイルを作成
    const { data: newProfile, error: insertError } = await supabase
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
    
    if (insertError) throw insertError;
    
    // ユーザープロファイルにYouTuberプロファイルIDを関連付ける
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ youtuber_profile_id: newProfile.id })
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    return newProfile;
  } catch (error) {
    console.error('YouTuberプロファイル作成エラー:', error);
    throw error;
  }
}

// YouTuberプロファイルを更新
export async function updateYoutuberProfile(profileId: string, profileData: Partial<YoutuberProfile>) {
  try {
    const { data, error } = await supabase
      .from('youtuber_profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('YouTuberプロファイル更新エラー:', error);
    throw error;
  }
}

// ユーザーにYouTuberプロファイルが存在するか確認
export async function hasYoutuberProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('youtuber_profile_id')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return !!data?.youtuber_profile_id;
  } catch (error) {
    console.error('YouTuberプロファイル確認エラー:', error);
    return false;
  }
}