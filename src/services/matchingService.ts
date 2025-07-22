/* eslint-disable @typescript-eslint/naming-convention */
import { supabase } from '@/lib/supabase';
import {
  getUserViewingStats,
  getCommonVideos as _getCommonVideos,
} from './viewingTrackingService';

import type {
  MatchingUser,
  MatchingProfileDetails,
  EnhancedMatchingUser,
} from '@/types/matching';
import { GenderPreference } from '@/types/matching';

import type {
  MatchingPreferences,
  MatchingPreferencesDB,
  LocationFilter,
} from '@/types/preferences';

/* ------------------------------------------------------------------ */
/*                            基本候補取得                             */
/* ------------------------------------------------------------------ */
export async function fetchMatchCandidates(
  userId: string,
  preferences: MatchingPreferences,
  isMatchedMode = false,
): Promise<MatchingUser[]> {
  try {
    /* 1. 閾値設定を取得（緩和／厳格） */
    const modeKey = preferences.relaxedMode ? 'RELAXED_MODE' : 'STRICT_MODE';
    const { data: setting } = await supabase
      .from('matching_settings')
      .select('value')
      .eq('key', modeKey)
      .single();

    const threshold =
      (setting?.value as { minSimilarity?: number })?.minSimilarity ?? 0.85;
    const maxResults =
      (setting?.value as { maxResults?: number })?.maxResults ?? 100;

    /* 2. 候補クエリ */
    let query = supabase
      .from('matching_candidates')
      .select(
        `candidate_id,
         similarity,
         matched_at,
         profiles:candidate_id (
           username,
           avatar_url,
           bio,
           gender,
           age,
           location
         )`,
      )
      .eq('user_id', userId)
      .gt('similarity', threshold)
      .order('similarity', { ascending: false })
      .limit(maxResults);

    /* マッチ済みモード → matched_at が NOT NULL の行のみ */
    if (isMatchedMode) query = query.not('matched_at', 'is', null);

    const { data, error } = await query;
    if (error) {
      console.error('マッチング候補取得エラー:', error);
      return [];
    }

    /* 3. 整形 */
    return (
      data?.map((item: any) => ({
        id: item.candidate_id,
        matching_score: item.similarity,
        is_matched: item.matched_at !== null, // ★ 追加
        username: item.profiles?.username ?? '',
        avatar_url: item.profiles?.avatar_url ?? '',
        bio: item.profiles?.bio ?? '',
        gender: item.profiles?.gender ?? '',
        age: item.profiles?.age ?? null,
        location: item.profiles?.location
          ? { prefecture: item.profiles.location }
          : null,
        interests: [],
        common_interests: [],
        is_premium: false,
      })) ?? []
    );
  } catch (err) {
    console.error('マッチング候補取得例外:', err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*                         Like / Skip 操作                            */
/* ------------------------------------------------------------------ */
export async function sendLike(
  senderId: string,
  receiverId: string,
  isPremium: boolean,
): Promise<{ success: boolean; isMatch: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('send_like', {
      sender_id: senderId,
      receiver_id: receiverId,
      is_premium: isPremium,
    });
    if (error) return { success: false, isMatch: false, error: error.message };
    /* send_like は {success,isMatch,error?} を JSON で返す */
    return {
      success: data?.success ?? false,
      isMatch: data?.isMatch ?? false,
      error: data?.error ?? undefined,
    };
  } catch {
    return { success: false, isMatch: false, error: '例外が発生しました' };
  }
}

export async function skipUser(
  userId: string,
  targetUserId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('user_skips')
    .insert({ user_id: userId, skipped_user_id: targetUserId });
  if (error) console.error('スキップエラー:', error);
  return !error;
}

export async function undoSkip(
  userId: string,
  targetUserId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('user_skips')
    .delete()
    .eq('user_id', userId)
    .eq('skipped_user_id', targetUserId);
  if (error) console.error('スキップ取り消しエラー:', error);
  return !error;
}

/* ------------------------------------------------------------------ */
/*                 以降（プロフィール・視聴データ処理）は変更なし        */
/* ------------------------------------------------------------------ */
/* …（省略せず全文を添付していますが、ここから下は前回と同じため割愛）*/


/* ------------------------------------------------------------------ */
/*                       プロフィール & 設定取得                        */
/* ------------------------------------------------------------------ */
export async function getMatchingProfile(
  currentUserId: string,
  targetUserId: string,
): Promise<MatchingProfileDetails | null> {
  const { data, error } = await supabase.rpc('fetch_matching_profile', {
    current_user_id: currentUserId,
    target_user_id: targetUserId,
  });
  if (error) {
    console.error('詳細プロフィール取得エラー:', error);
    return null;
  }
  return data as MatchingProfileDetails;
}

export async function getMatchingPreferences(
  userId: string,
): Promise<MatchingPreferences> {
  const { data, error } = await supabase
    .from('user_matching_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('マッチング設定取得エラー:', error);
    throw error;
  }

  /* --- デフォルト値を埋めながら型変換 --- */
  return {
    genderPreference: data?.gender_preference ?? GenderPreference.ANY,
    ageRange:
      data?.age_min !== null && data?.age_max !== null
        ? [data.age_min, data.age_max]
        : [18, 99],
    location: data?.location
      ? ({ prefecture: data.location } as LocationFilter)
      : undefined,
    interests: Array.isArray(data?.interests) ? data.interests : [],
    genrePreference: Array.isArray(data?.genre_preference)
      ? data.genre_preference
      : [],
    activityLevel: data?.activity_level ?? undefined,

    maxDistance: data?.max_distance ?? undefined,
    minCommonInterests: data?.min_common_interests ?? undefined,
    onlineOnly: data?.online_only ?? undefined,
    premiumOnly: data?.premium_only ?? undefined,
    hasVideoHistory: data?.has_video_history ?? undefined,
    recentActivity: data?.recent_activity ?? undefined,
    filterSkipped: data?.filter_skipped ?? undefined,
    excludeLikedUsers: data?.exclude_liked_users ?? undefined,

    relaxedMode: data?.relaxed_mode ?? false,
  };
}

export async function saveMatchingPreferences(
  userId: string,
  prefs: MatchingPreferences,
): Promise<boolean> {
  const payload: MatchingPreferencesDB = {
    user_id: userId,
    gender_preference: prefs.genderPreference ?? GenderPreference.ANY,
    age_min: prefs.ageRange[0],
    age_max: prefs.ageRange[1],

    location: prefs.location?.prefecture ?? null,
    interests: prefs.interests ?? [],
    genre_preference: prefs.genrePreference ?? [],
    activity_level: prefs.activityLevel ?? null,

    max_distance: prefs.maxDistance ?? null,
    min_common_interests: prefs.minCommonInterests ?? null,
    online_only: prefs.onlineOnly ?? null,
    premium_only: prefs.premiumOnly ?? null,
    has_video_history: prefs.hasVideoHistory ?? null,
    recent_activity: prefs.recentActivity ?? null,
    filter_skipped: prefs.filterSkipped ?? null,
    exclude_liked_users: prefs.excludeLikedUsers ?? null,

    relaxed_mode: prefs.relaxedMode ?? null,
  };

  const { error } = await supabase
    .from('user_matching_preferences')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.error('マッチング設定保存エラー:', error);
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*                       視聴データ込みの候補取得                        */
/* ------------------------------------------------------------------ */
export async function fetchEnhancedMatchCandidates(
  userId: string,
  preferences: MatchingPreferences,
  useViewingData = true,
): Promise<EnhancedMatchingUser[]> {
  const basic = await fetchMatchCandidates(userId, preferences);
  if (!useViewingData) return basic as EnhancedMatchingUser[];

  const enhanced = await Promise.all(
    basic.map(async (candidate) => {
      try {
        const { data: ext } = await supabase
          .from('matching_candidates')
          .select(
            `
            content_similarity,
            rating_correlation,
            viewing_pattern_match,
            genre_similarity,
            common_videos_count,
            match_reason`,
          )
          .eq('user_id', userId)
          .eq('candidate_id', candidate.id)
          .single();

        const commonVideos = await _getCommonVideos(userId, candidate.id, 5);
        const stats = await getUserViewingStats(candidate.id);

        return <EnhancedMatchingUser>{
          ...candidate,
          content_similarity: ext?.content_similarity ?? 0,
          rating_correlation: ext?.rating_correlation ?? 0,
          viewing_pattern_match: ext?.viewing_pattern_match ?? 0,
          genre_similarity: ext?.genre_similarity ?? 0,
          viewing_stats: stats ?? undefined,
          match_details: {
            common_videos: commonVideos,
            match_reasons: ext?.match_reason?.reasons ?? [],
            similarity_breakdown: {
              content: ext?.content_similarity ?? 0,
              rating: ext?.rating_correlation ?? 0,
              timing: ext?.viewing_pattern_match ?? 0,
              genre: ext?.genre_similarity ?? 0,
            },
          },
          common_videos_count: ext?.common_videos_count ?? 0,
        };
      } catch (e) {
        console.error('候補拡張処理エラー:', e);
        return candidate as EnhancedMatchingUser;
      }
    }),
  );
  return enhanced;
}

/* ------------------------------------------------------------------ */
/*                        追加ユーティリティ (API)                      */
/* ------------------------------------------------------------------ */

/** 共通視聴動画の取得（再エクスポート） */
export const getCommonVideos = _getCommonVideos;

/** ジャンル別視聴本数などの閲覧トレンドを取得 */
export async function getViewingTrends(
  userId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('user_viewing_trends')
    .select('genre, count')
    .eq('user_id', userId);

  if (error || !data) {
    console.error('視聴トレンド取得エラー:', error);
    return {};
  }

  return data.reduce<Record<string, number>>(
    (acc, cur) => ({ ...acc, [cur.genre]: cur.count }),
    {},
  );
}

/** 共通フレンドの取得例 */
export async function getCommonFriends(
  userId1: string,
  userId2: string,
): Promise<
  { id: string; username: string; avatar_url?: string | null }[]
> {
  const { data, error } = await supabase.rpc('get_common_friends', {
    user1_id: userId1,
    user2_id: userId2,
  });

  if (error || !data) {
    console.error('共通フレンド取得エラー:', error);
    return [];
  }
  return data;
}

/* ------------------------------------------------------------------ */
/*                 視聴類似度 & 視聴パターン分析ユーティリティ          */
/* ------------------------------------------------------------------ */

/**
 * 2 ユーザーの視聴類似度を簡易計算
 */
export async function calculateViewingSimilarity(
  userId1: string,
  userId2: string,
): Promise<number> {
  try {
    const commonVideos = await _getCommonVideos(userId1, userId2, 50);

    if (commonVideos.length < 3) return 0;

    let total = 0;
    let comps = 0;

    for (const v of commonVideos) {
      if (v.user1_rating && v.user2_rating) {
        const diff = Math.abs(v.user1_rating - v.user2_rating);
        total += 1 - diff / 4;
        comps++;
      }
      if (v.user1_completion && v.user2_completion) {
        const diff = Math.abs(v.user1_completion - v.user2_completion);
        total += 1 - diff;
        comps++;
      }
    }
    return comps ? total / comps : 0;
  } catch (err) {
    console.error('視聴類似度計算エラー:', err);
    return 0;
  }
}

/**
 * ユーザー 1 人の視聴パターンを集計
 */
export async function analyzeViewingPattern(userId: string): Promise<{
  topGenres: { genre: string; count: number; avgRating: number }[];
  viewingTimes: { hour: number; count: number }[];
  completionRate: number;
  totalHours: number;
}> {
  try {
    const { data: history, error } = await supabase
      .from('viewing_history')
      .select(
        'category, user_rating, completion_rate, viewing_duration, watched_at',
      )
      .eq('user_id', userId)
      .order('watched_at', { ascending: false })
      .limit(200);

    if (error || !history) throw error;

    const genreStats: Record<
      string,
      { count: number; totalRating: number; ratingCount: number }
    > = {};
    const hourStats: Record<number, number> = {};
    let totalCompletion = 0;
    let compCount = 0;
    let totalSecs = 0;

    history.forEach((h) => {
      /* ジャンル */
      if (h.category) {
        genreStats[h.category] ??= {
          count: 0,
          totalRating: 0,
          ratingCount: 0,
        };
        genreStats[h.category].count++;
        if (h.user_rating) {
          genreStats[h.category].totalRating += h.user_rating;
          genreStats[h.category].ratingCount++;
        }
      }

      /* 完了率 */
      if (h.completion_rate !== null) {
        totalCompletion += h.completion_rate;
        compCount++;
      }

      /* 視聴時間 */
      if (h.viewing_duration) totalSecs += h.viewing_duration;

      /* 視聴時間帯 */
      if (h.watched_at) {
        const hr = new Date(h.watched_at).getHours();
        hourStats[hr] = (hourStats[hr] ?? 0) + 1;
      }
    });

    /* 整形 */
    const topGenres = Object.entries(genreStats)
      .map(([g, s]) => ({
        genre: g,
        count: s.count,
        avgRating: s.ratingCount ? s.totalRating / s.ratingCount : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const viewingTimes = Object.entries(hourStats)
      .map(([h, c]) => ({ hour: Number(h), count: c }))
      .sort((a, b) => a.hour - b.hour);

    return {
      topGenres,
      viewingTimes,
      completionRate: compCount ? totalCompletion / compCount : 0,
      totalHours: Math.round((totalSecs / 3600) * 10) / 10,
    };
  } catch (err) {
    console.error('視聴パターン分析エラー:', err);
    return {
      topGenres: [],
      viewingTimes: [],
      completionRate: 0,
      totalHours: 0,
    };
  }
}
