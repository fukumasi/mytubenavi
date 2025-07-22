/* eslint-disable @typescript-eslint/naming-convention */
import { GenderPreference, ActivityLevel } from '@/types/matching';

/* ---------------------------- UI 用フィルタ型 ---------------------------- */
export interface LocationFilter {
  prefecture?: string;
  region?: string;
}

export interface MatchingPreferences {
  /* 基本フィルタ */
  genderPreference?: GenderPreference;
  ageRange: [number, number];
  location?: LocationFilter;
  interests: string[];
  genrePreference: string[];
  activityLevel?: ActivityLevel;

  /* 詳細オプション */
  maxDistance?: number;          // km
  minCommonInterests?: number;
  onlineOnly?: boolean;
  premiumOnly?: boolean;
  hasVideoHistory?: boolean;
  recentActivity?: boolean;
  filterSkipped?: boolean;
  excludeLikedUsers?: boolean;

  /* その他 */
  relaxedMode?: boolean;
}

/* ---------------------------- DB 永続化用型 ----------------------------- */
export interface MatchingPreferencesDB {
  user_id: string;
  gender_preference: GenderPreference | null;
  age_min: number | null;
  age_max: number | null;
  location: string | null;                // 都道府県コード等
  interests: string[] | null;
  genre_preference: string[] | null;
  activity_level: ActivityLevel | null;

  /* 詳細オプションを JSONB カラム 1 本で持っている想定 */
  max_distance?: number | null;
  min_common_interests?: number | null;
  online_only?: boolean | null;
  premium_only?: boolean | null;
  has_video_history?: boolean | null;
  recent_activity?: boolean | null;
  filter_skipped?: boolean | null;
  exclude_liked_users?: boolean | null;

  relaxed_mode: boolean | null;
  created_at?: string;
}
