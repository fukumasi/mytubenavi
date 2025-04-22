// src/types/matching.ts

/**
 * オンライン状態を表す列挙型
 */
export enum OnlineStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy'
}

/**
 * 活動レベルを表す列挙型
 */
export enum ActivityLevel {
  VERY_ACTIVE = 'very_active',
  ACTIVE = 'active',
  MODERATE = 'moderate', 
  CASUAL = 'casual'
}

/**
 * 接続状態を表す列挙型
 */
export enum ConnectionStatus {
  NONE = 'none',
  PENDING = 'pending',
  CONNECTED = 'connected',
  REJECTED = 'rejected'
}

/**
 * 性別の選択肢を表す列挙型
 */
export enum GenderPreference {
  ANY = 'any',
  MALE = 'male',
  FEMALE = 'female'
}

/**
 * マッチング機能で使用するユーザープロフィール情報
 * ユーザーの基本データや興味、マッチング情報などを含む
 */
export interface MatchingUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  interests: string[];
  matching_score: number;  
  common_interests: string[];  
  common_genres?: string[];  
  common_videos_count?: number;  
  is_premium: boolean;  
  gender: string;  
  age: number | null;  
  location: {
    prefecture?: string;  
    region?: string;  
  } | null;
  activity_level?: ActivityLevel | number;  
  online_status?: OnlineStatus;  
  last_active?: string;  
  connection_status?: ConnectionStatus;  
  is_liked?: boolean;  
  is_matched?: boolean;
  conversation_id?: string;
  channel_url?: string;  
  viewing_trends?: Record<string, number>;  
  common_friends?: Array<{
    id: string;
    username: string;
    avatar_url?: string | null;
  }>;
  connection_id?: string | null;  // 接続情報のID
  is_initiator?: boolean;        // 接続リクエストの送信者かどうか
}

/**
 * スキップしたユーザー情報
 * MatchingUserに加えてスキップした日時情報を持つ
 */
export interface SkippedUser extends MatchingUser {
  skipped_at: string;  // スキップした日時（ISO 8601形式）
}

/**
 * マッチング検索の設定条件
 * ユーザーが指定するマッチング検索の条件を表す
 */
export interface MatchingPreferences {
  gender_preference: GenderPreference | string;  // 性別の選択（'any', 'male', 'female'）
  age_range_min: number;  // 最小年齢（18以上）
  age_range_max: number;  // 最大年齢
  location_preference: {  // 地域の設定
    prefecture?: string;  // 都道府県
    region?: string;  // 地域
  };
  interest_tags: string[];  // 興味タグのリスト
  genre_preference: string[];  // 好みのジャンルリスト
  activity_level: ActivityLevel | string;  // 活動レベルの選択
  
  // 詳細なマッチング条件（オプション）
  max_distance?: number;  // km単位での最大距離（0の場合は制限なし）
  min_common_interests?: number;  // 最小共通興味数（0の場合は制限なし）
  
  // フィルター設定（オプション）
  online_only?: boolean;  // オンラインユーザーのみを表示するかどうか
  premium_only?: boolean;  // プレミアムユーザーのみを表示するかどうか
  has_video_history?: boolean;  // 視聴履歴があるユーザーのみを表示
  recent_activity?: boolean;  // 最近活動したユーザーのみを表示
  filter_skipped?: boolean;  // スキップしたユーザーを表示しないかどうか
  exclude_liked_users?: boolean;  // いいね済みユーザーを除外するかどうか
}

/**
 * ユーザーのポイント情報
 * ポイント残高や獲得履歴を管理
 */
export interface UserPoints {
  balance: number;  // 現在のポイント残高
  lifetime_earned: number;  // 累計獲得ポイント
  last_updated: string;  // 最終更新日時（ISO 8601形式）
}

/**
 * ポイント取引のタイプ
 * ポイントの獲得や消費を分類するための型
 */
export type TransactionType = 
  | 'review'           // レビュー投稿（獲得）
  | 'purchase'         // ポイント購入（獲得）
  | 'message'          // メッセージ送信（消費）
  | 'profile_view'     // プロフィール詳細表示（消費）
  | 'refund'           // 返金（獲得）
  | 'login_bonus'      // ログインボーナス（獲得）
  | 'streak_bonus'     // 連続ログインボーナス（獲得）
  | 'like'             // いいね送信（消費）
  | 'match_bonus'      // マッチング成立ボーナス（獲得）
  | 'message_activity' // メッセージのやり取り（獲得）
  | 'filter_usage'     // 検索フィルター使用（消費）
  | 'intimacy_level_up';  // 親密度レベルアップボーナス（獲得）

/**
 * ポイント取引の記録
 * ポイントの獲得や消費の履歴を管理
 */
export interface PointTransaction {
  id: string;  // 取引ID
  user_id: string;  // ユーザーID
  amount: number;  // ポイント量（正数は獲得、負数は消費）
  transaction_type: TransactionType;  // 取引タイプ
  reference_id?: string;  // 関連するエンティティのID（例：メッセージID）
  created_at: string;  // 作成日時（ISO 8601形式）
  description?: string;  // 取引の説明
}

/**
 * ユーザーの認証状態
 * ユーザーの本人確認状態を管理
 */
export interface VerificationStatus {
  email_verified: boolean;  // メール認証済みか
  phone_verified: boolean;  // 電話番号認証済みか
  id_verified: boolean;  // 身分証明書による認証済みか
  verification_level: number;  // 認証レベル（0-3）
  verification_provider?: string;  // 認証プロバイダ
  last_verified?: string;  // 最終認証日時（ISO 8601形式）
  verification_expiry?: string;  // 認証の有効期限（ISO 8601形式）
}

/**
 * メッセージの添付ファイル情報
 * メッセージに添付された画像やファイルの情報
 */
export interface MessageAttachment {
  id?: string;  // 添付ファイルID
  message_id: string;  // 添付先メッセージID
  file_url: string;  // ファイルのURL
  file_type: string;  // ファイルのMIMEタイプ
  file_name: string;  // ファイル名
  file_size: number;  // ファイルサイズ（バイト）
  created_at: string;  // 作成日時（ISO 8601形式）
  thumbnail_url?: string;  // サムネイルURL（画像の場合）
}

/**
 * メッセージの情報
 * ユーザー間のメッセージデータ
 */
export interface Message {
  id: string;  // メッセージID
  sender_id: string;  // 送信者ID
  receiver_id: string;  // 受信者ID
  conversation_id: string;  // 会話ID
  content: string;  // メッセージ内容
  is_highlighted: boolean;  // 強調表示されたメッセージか
  is_read: boolean;  // 既読状態
  has_attachment?: boolean;  // 添付ファイルがあるかどうか
  created_at: string;  // 作成日時（ISO 8601形式）
  updated_at: string;  // 更新日時（ISO 8601形式）
  deleted_by_sender?: boolean;  // 送信者が削除したか
  deleted_by_receiver?: boolean;  // 受信者が削除したか
}

/**
 * 会話（スレッド）の情報
 * ユーザー間の会話を管理
 */
export interface Conversation {
  id: string;  // 会話ID
  user1_id: string;  // ユーザー1のID
  user2_id: string;  // ユーザー2のID
  last_message_time: string;  // 最後のメッセージ時間（ISO 8601形式）
  is_active: boolean;  // アクティブな会話か（削除済みでないか）
  user1_unread_count: number;  // ユーザー1の未読メッセージ数
  user2_unread_count: number;  // ユーザー2の未読メッセージ数
  intimacy_level?: number;  // 親密度レベル（0-5）
}

/**
 * 相手のプロフィール情報を含む会話情報
 * 会話リスト表示用に拡張した会話情報
 */
export interface ConversationWithProfile extends Conversation {
  otherUser: {  // 相手ユーザーの情報
    id: string;
    username: string;
    avatar_url?: string | null;
    is_premium?: boolean;
    online_status?: OnlineStatus | string;
    last_active?: string;  // ISO 8601形式
    verification_level?: number; // 認証レベル
  };
  last_message?: {  // 最後のメッセージ情報
    content: string;
    created_at: string;  // ISO 8601形式
    sender_id: string;
    is_read: boolean;
    is_highlighted?: boolean; // ハイライトメッセージかどうか
    has_attachment?: boolean; // 添付ファイルがあるかどうか
  } | null;
  unread_count: number;  // 現在のユーザーの未読数
}

/**
 * 動画の基本情報
 * 視聴動画の基本的な情報
 */
export interface VideoDetails {
  id: string;  // 動画ID（UUID）
  youtube_id: string;  // YouTube動画ID
  title: string;  // 動画タイトル
  thumbnail_url: string;  // サムネイルURL
  channel_name?: string;  // チャンネル名
  description?: string;  // 動画の説明
  published_at?: string;  // 公開日時（ISO 8601形式）
  duration?: number;  // 動画の長さ（秒）
  view_count?: number;  // 視聴回数
}

/**
 * マッチングの詳細プロフィール情報
 * プロフィール詳細表示用の拡張情報
 */
export interface MatchingProfileDetails {
  profile: MatchingUser;  // ユーザープロフィール
  commonInterests: string[];  // 共通の興味
  commonVideos: VideoDetails[];  // 共通の視聴動画
}

/**
 * ユーザーのアクティビティデータ
 * ユーザーの活動状況を把握するためのデータ
 */
export interface ActivityData {
  loginCount: number;  // ログイン回数
  commentCount: number;  // コメント数
  ratingCount: number;  // 評価数
  messageCount: number;  // メッセージ数
  lastLogin?: string;  // 最終ログイン日時（ISO 8601形式）
  activityScore: number;  // 活動スコア（1-10）
}

/**
 * ユーザーのスキップ情報
 * ユーザーがスキップした相手の情報
 */
export interface UserSkip {
  id: string;  // スキップ情報ID
  user_id: string;  // スキップしたユーザーID
  skipped_user_id: string;  // スキップされたユーザーID
  created_at: string;  // 作成日時（ISO 8601形式）
}

/**
 * ユーザーのいいね情報
 * ユーザーがいいねした相手の情報
 */
export interface UserLike {
  id: string;  // いいね情報ID
  user_id: string;  // いいねしたユーザーID
  liked_user_id: string;  // いいねされたユーザーID
  created_at: string;  // 作成日時（ISO 8601形式）
}

/**
 * ユーザーマッチング情報
 * マッチングが成立した二人のユーザー情報
 */
export interface UserMatch {
  id: string;  // マッチング情報ID
  user1_id: string;  // ユーザー1のID
  user2_id: string;  // ユーザー2のID
  created_at: string;  // マッチング成立日時（ISO 8601形式）
}

/**
 * 場所の設定を表すインターフェース
 * 地域と都道府県の情報を含む
 */
export interface LocationPreference {
  /** 都道府県 */
  prefecture?: string;
  /** 地域（関東、関西など） */
  region?: string;
}