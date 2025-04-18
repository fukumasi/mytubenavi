// src/hooks/useYoutuberProfile.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface YoutuberProfile {
  id: string;
  channel_name: string;
  channel_url: string;
  channel_description?: string;
  verification_status: string;
  verified_at?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export function useYoutuberProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<YoutuberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchYoutuberProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // まずprofilesテーブルからYouTuber IDを取得する
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('youtuber_profile_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        if (userError.code !== 'PGRST116') { // 見つからないエラーでなければスロー
          throw userError;
        }
        setLoading(false);
        return;
      }

      // YouTuberプロファイルIDが存在する場合のみ取得
      if (userData?.youtuber_profile_id) {
        const { data: youtuberData, error: youtuberError } = await supabase
          .from('youtuber_profiles')
          .select('*')
          .eq('id', userData.youtuber_profile_id)
          .single();

        if (youtuberError) {
          throw youtuberError;
        }

        setProfile(youtuberData);
      }
    } catch (err) {
      console.error('YouTuberプロファイルの取得に失敗:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // YouTuberプロファイルの作成または更新
  const updateYoutuberProfile = useCallback(async (profileData: Partial<YoutuberProfile>) => {
    if (!user) {
      throw new Error('ログインが必要です');
    }

    try {
      setLoading(true);
      setError(null);

      // 既存のプロファイルを確認
      const { data: userData } = await supabase
        .from('profiles')
        .select('youtuber_profile_id')
        .eq('id', user.id)
        .single();

      let youtuberProfileId = userData?.youtuber_profile_id;

      // プロファイルがまだ存在しない場合は新規作成
      if (!youtuberProfileId) {
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
        youtuberProfileId = newProfile.id;

        // プロファイルにYouTuberプロファイルIDを関連付け
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ youtuber_profile_id: youtuberProfileId })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // 既存のプロファイルを更新
        const { error: updateError } = await supabase
          .from('youtuber_profiles')
          .update({
            ...profileData,
            updated_at: new Date().toISOString()
          })
          .eq('id', youtuberProfileId);

        if (updateError) throw updateError;
      }

      // 更新されたプロファイルを取得
      await fetchYoutuberProfile();

      return { success: true };
    } catch (err) {
      console.error('YouTuberプロファイルの更新に失敗:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      return { success: false, error: err instanceof Error ? err.message : '更新に失敗しました' };
    } finally {
      setLoading(false);
    }
  }, [user, fetchYoutuberProfile]);

  useEffect(() => {
    fetchYoutuberProfile();
  }, [fetchYoutuberProfile]);

  return {
    profile,
    loading,
    error,
    refresh: fetchYoutuberProfile,
    updateProfile: updateYoutuberProfile
  };
}