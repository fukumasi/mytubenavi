// src/components/matching/UserCard.tsx

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPercent,
  faHeart,
  faLocationDot,
  faCrown,
  faClock,
  faVideo,
  faTag,
  faThumbsUp,
  faForward,
  faExternalLinkAlt,
  faUserFriends,
  faEye,
  faUserPlus,
  faCheck,
  faHourglass,
  faTimes,
  faVenus, // 認証済み女性用アイコン
  faHandshake, // マッチング済みアイコン
  faComments // メッセージアイコン
} from '@fortawesome/free-solid-svg-icons';
import { MatchingUser, VideoDetails, OnlineStatus, ActivityLevel, ConnectionStatus } from '@/types/matching'; // ConnectionStatus をインポート
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Link } from 'react-router-dom'; // Linkをインポート

// --- Propsの定義 ---
interface UserCardProps {
  user: MatchingUser;
  onLike: (userId: string) => Promise<boolean>;
  onSkip: (userId: string) => Promise<boolean>;
  onViewProfile?: (userId: string) => Promise<void>;
  onConnect?: (userId: string) => Promise<boolean>;
  // 接続リクエスト応答のためのプロパティを追加
  onAcceptConnection?: (connectionId: string) => Promise<boolean>; // connectionId を受け取るように変更
  onRejectConnection?: (connectionId: string) => Promise<boolean>; // connectionId を受け取るように変更
  commonVideos?: VideoDetails[]; // オプショナルに変更、デフォルト値をコンポーネント内で設定
  isPremium?: boolean; // オプショナルに変更、デフォルト値をコンポーネント内で設定
  hasDetailedView?: boolean; // オプショナルに変更、デフォルト値をコンポーネント内で設定
  similarityScore?: number; // オプショナル
  showYouTubeLink?: boolean; // オプショナルに変更、デフォルト値をコンポーネント内で設定
  userGender?: string | null; // オプショナルに変更、デフォルト値をコンポーネント内で設定
  isPhoneVerified?: boolean; // オプショナルに変更、デフォルト値をコンポーネント内で設定
  isMatchedUser?: boolean; // オプショナルに変更、デフォルト値をコンポーネント内で設定
}

// --- コンポーネント本体 ---
const UserCard = ({
  user,
  onLike,
  onSkip,
  onViewProfile,
  onConnect,
  onAcceptConnection, // Propsから受け取る
  onRejectConnection, // Propsから受け取る
  commonVideos = [], // デフォルト値を設定
  isPremium = false, // デフォルト値を設定
  hasDetailedView = false, // デフォルト値を設定
  similarityScore, // デフォルト値なし（undefined許容）
  showYouTubeLink = false, // デフォルト値を設定
  userGender = null, // デフォルト値を設定
  isPhoneVerified = false, // デフォルト値を設定
  isMatchedUser = false // デフォルト値を設定
}: UserCardProps): JSX.Element => { // 戻り値の型を明示
  const defaultAvatar = '/default-avatar.jpg'; // デフォルトアバターパス
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // 処理中フラグ
  const [error, setError] = useState<string | null>(null); // エラーメッセージ
  const [showDetails, setShowDetails] = useState<boolean>(false); // 詳細表示フラグ
  const [expandedVideos, setExpandedVideos] = useState<boolean>(false); // 動画リスト展開フラグ
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(user.connection_status || ConnectionStatus.NONE); // 接続ステータス (初期値設定)

  // --- useEffectで外部からのconnection_status変更を監視 ---
  useEffect(() => {
    if (user.connection_status !== connectionStatus) {
      setConnectionStatus(user.connection_status || ConnectionStatus.NONE);
    }
  }, [user.connection_status, connectionStatus]); // connectionStatusも依存配列に追加

  // --- 定数・ヘルパー変数 ---
  // 無料で詳細プロフィールを見れるかどうかのフラグ
  const isFreeProfileView = isPremium || (userGender === 'female' && isPhoneVerified);

  // --- ヘルパー関数 ---

  // マッチスコアの色を返す関数
  const getMatchScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-gray-500';
  };

  // 活動レベルのテキストを返す関数
  const getActivityLevelText = (level?: ActivityLevel | number): string => {
    if (level === undefined) return '不明';
    // 数値の場合の処理を追加
    if (typeof level === 'number') {
      if (level >= 8) return '非常に活発';
      if (level >= 6) return '活発';
      if (level >= 4) return '普通';
      if (level >= 2) return 'やや静か';
      return '静か';
    }
    // Enumの場合の処理
    switch (level) {
      case ActivityLevel.VERY_ACTIVE: return '非常に活発';
      case ActivityLevel.ACTIVE: return '活発';
      case ActivityLevel.MODERATE: return '普通';
      case ActivityLevel.CASUAL: return 'カジュアル'; // CASUALを追加
      default: return '不明';
    }
  };

  // 活動レベルの色を返す関数
  const getActivityLevelColor = (level?: ActivityLevel | number): string => {
    if (level === undefined) return 'text-gray-500';
     // 数値の場合の処理を追加
    if (typeof level === 'number') {
        if (level >= 8) return 'text-green-600';
        if (level >= 6) return 'text-green-500';
        if (level >= 4) return 'text-blue-500';
        if (level >= 2) return 'text-yellow-500';
        return 'text-gray-500';
    }
    // Enumの場合の処理
    switch (level) {
      case ActivityLevel.VERY_ACTIVE: return 'text-green-600';
      case ActivityLevel.ACTIVE: return 'text-green-500';
      case ActivityLevel.MODERATE: return 'text-blue-500';
      case ActivityLevel.CASUAL: return 'text-yellow-500'; // CASUALを追加
      default: return 'text-gray-500';
    }
  };

  // オンラインステータス表示を生成する関数
  const getOnlineStatus = (): JSX.Element | null => {
    if (!user.online_status) return null; // ステータスがない場合はnull
    if (user.online_status === OnlineStatus.ONLINE) { // Enumと比較
      return (
        <span className="inline-flex items-center text-green-600 text-xs">
          <span className="w-2 h-2 bg-green-600 rounded-full mr-1"></span>
          オンライン
        </span>
      );
    }
    if (user.last_active) {
      // Dateオブジェクトへの変換とバリデーション
      const lastActiveDate = new Date(user.last_active);
      if (isNaN(lastActiveDate.getTime())) {
          console.error("Invalid date format for last_active:", user.last_active);
          return null; // 無効な日付の場合は何も表示しない
      }
      return (
        <span className="inline-flex items-center text-gray-500 text-xs">
          <span className="w-2 h-2 bg-gray-500 rounded-full mr-1"></span>
          {formatDistance(lastActiveDate, new Date(), { addSuffix: true, locale: ja })}にオンライン
        </span>
      );
    }
    return null; // それ以外の場合もnull
  };

  // 年齢表示テキスト
  const displayAge = user.age ? `${user.age}歳` : '';
  // 居住地表示テキスト (より安全な型チェック)
  const displayLocation = typeof user.location === 'object' && user.location !== null && 'prefecture' in user.location && user.location.prefecture
    ? user.location.prefecture
    : (typeof user.location === 'string' ? user.location : '');

  // --- イベントハンドラー ---

  // 「いいね」処理
  const handleLike = async (): Promise<void> => {
    if (isProcessing) return; // 処理中は中断
    setIsProcessing(true);
    setError(null); // エラーをリセット
    try {
      const success = await onLike(user.id); // Propsの関数を呼び出し
      if (!success) setError('処理に失敗しました。もう一度お試しください。');
      // 成功時は親コンポーネントがリストを更新することを想定
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error('いいね処理でエラー:', err);
    } finally {
      setIsProcessing(false); // 処理完了
    }
  };

  // 「スキップ」処理
  const handleSkip = async (): Promise<void> => {
    if (isProcessing) return; // 処理中は中断
    setIsProcessing(true);
    setError(null); // エラーをリセット
    try {
      const success = await onSkip(user.id); // Propsの関数を呼び出し
      if (!success) setError('処理に失敗しました。もう一度お試しください。');
      // 成功時は親コンポーネントがリストを更新することを想定
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error('スキップ処理でエラー:', err);
    } finally {
      setIsProcessing(false); // 処理完了
    }
  };

  // 「つながるリクエスト」処理
  const handleConnect = async (): Promise<void> => {
    if (!onConnect || isProcessing) return; // 関数がないか処理中は中断
    setIsProcessing(true);
    setError(null); // エラーをリセット
    try {
      const success = await onConnect(user.id); // Propsの関数を呼び出し
      if (success) {
        // 成功した場合、ローカルの状態を更新して即時フィードバック
        setConnectionStatus(ConnectionStatus.PENDING); // Enumを使用
      } else {
        setError('接続リクエストの送信に失敗しました。');
      }
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error('接続リクエスト送信でエラー:', err);
    } finally {
      setIsProcessing(false); // 処理完了
    }
  };

  // 接続リクエスト「承認」処理
  const handleAcceptConnection = async (): Promise<void> => {
    if (!onAcceptConnection || !user.connection_id || isProcessing) return; // 関数・IDがないか処理中は中断
    setIsProcessing(true);
    setError(null); // エラーをリセット
    try {
      const success = await onAcceptConnection(user.connection_id); // Propsの関数にconnection_idを渡す
      if (success) {
        // 成功した場合、ローカルの状態を更新して即時フィードバック
        setConnectionStatus(ConnectionStatus.CONNECTED); // Enumを使用
      } else {
        setError('接続リクエストの承認に失敗しました。');
      }
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error('接続リクエスト承認でエラー:', err);
    } finally {
      setIsProcessing(false); // 処理完了
    }
  };

  // 接続リクエスト「拒否」処理
  const handleRejectConnection = async (): Promise<void> => {
    if (!onRejectConnection || !user.connection_id || isProcessing) return; // 関数・IDがないか処理中は中断
    setIsProcessing(true);
    setError(null); // エラーをリセット
    try {
      const success = await onRejectConnection(user.connection_id); // Propsの関数にconnection_idを渡す
      if (success) {
        // 成功した場合、ローカルの状態を更新して即時フィードバック
        // 拒否した場合、ステータスは NONE に戻すか、REJECTED を維持するかは要件次第
        // ここでは NONE に戻す例 (相手側では PENDING のままかもしれない点に注意)
        // setConnectionStatus(ConnectionStatus.NONE);
        // REJECTED を維持するなら:
         setConnectionStatus(ConnectionStatus.REJECTED); // Enumを使用
      } else {
        setError('接続リクエストの拒否に失敗しました。');
      }
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error('接続リクエスト拒否でエラー:', err);
    } finally {
      setIsProcessing(false); // 処理完了
    }
  };

  // 「詳細プロフィールを見る」処理
  const handleViewProfile = async (): Promise<void> => {
    if (!onViewProfile || isProcessing) return; // 関数がないか処理中は中断
    setIsProcessing(true);
    setError(null); // エラーをリセット
    try {
      await onViewProfile(user.id); // Propsの関数を呼び出し
      setShowDetails(true); // 詳細表示フラグを立てる
    } catch (err) {
      setError('プロフィールの取得に失敗しました。');
      console.error('プロフィール表示でエラー:', err);
    } finally {
      setIsProcessing(false); // 処理完了
    }
  };

  // --- レンダリング関数 ---

  // 接続リクエスト応答ボタン（承認/拒否）を表示する関数
  const renderConnectionResponseButtons = (): JSX.Element | null => {
    // PENDING状態で、自分がリクエスト受信者(is_initiatorがfalse)の場合のみ表示
    if (connectionStatus !== ConnectionStatus.PENDING || !user.connection_id || user.is_initiator || !onAcceptConnection || !onRejectConnection) {
      return null;
    }

    return (
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={handleRejectConnection} // 拒否ハンドラー
          disabled={isProcessing} // 処理中は無効
          className={`flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 font-semibold rounded-lg transition-colors text-sm ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-200'
          }`}
        >
          <FontAwesomeIcon icon={faTimes} className="mr-1.5" />
          拒否する
        </button>
        <button
          onClick={handleAcceptConnection} // 承認ハンドラー
          disabled={isProcessing} // 処理中は無効
          className={`flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 font-semibold rounded-lg transition-colors text-sm ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-200'
          }`}
        >
          <FontAwesomeIcon icon={faCheck} className="mr-1.5" />
          承認する
        </button>
      </div>
    );
  };

  // 「つながるリクエスト」ボタンまたは接続ステータスを表示する関数
  const renderConnectionButton = (): JSX.Element | null => {
    // プレミアム会員でない、onConnectがない、またはマッチング済みの場合は表示しない
    // ※要件によってはプレミアムチェックを外すことも可能
    if (!isPremium || !onConnect || isMatchedUser) return null;

    switch (connectionStatus) { // useState の connectionStatus (小文字) を使う
      case ConnectionStatus.CONNECTED: // Enum と比較
        return (
          <div className="mt-4">
            <span className="inline-flex items-center justify-center w-full py-2 bg-green-100 text-green-700 font-semibold rounded-lg text-sm">
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              つながり済み
            </span>
          </div>
        );
      case ConnectionStatus.PENDING: // Enum と比較
        //自分が送信者(is_initiator=true)の場合のみ「送信済み」を表示
        if (user.is_initiator) {
            return (
            <div className="mt-4">
                <span className="inline-flex items-center justify-center w-full py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg text-sm">
                <FontAwesomeIcon icon={faHourglass} className="mr-2" />
                リクエスト送信済み
                </span>
            </div>
            );
        }
        // 受信者の場合は応答ボタンが表示されるのでここではnull
        return null;
      case ConnectionStatus.REJECTED: // Enum と比較
        return (
          <div className="mt-4">
            <span className="inline-flex items-center justify-center w-full py-2 bg-red-100 text-red-700 font-semibold rounded-lg text-sm">
              <FontAwesomeIcon icon={faTimes} className="mr-2" />
              接続できません
            </span>
          </div>
        );
      case ConnectionStatus.NONE: // Enum と比較
      default:
        // まだリクエストしていない場合
        return (
          <div className="mt-4">
            <button
              onClick={handleConnect} // 接続リクエストハンドラー
              disabled={isProcessing} // 処理中は無効
              className={`w-full py-2 flex items-center justify-center bg-indigo-500 text-white font-semibold rounded-lg transition-colors text-sm ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
              {isProcessing ? '処理中...' : 'つながるリクエストを送る'}
            </button>
          </div>
        );
    }
  };

  // 共通の興味またはジャンルが存在するかどうかのフラグ
  const hasCommonInterestsOrGenres = (
    (user.common_interests && user.common_interests.length > 0) ||
    (user.common_genres && user.common_genres.length > 0)
  );

  // YouTubeチャンネルへのリンクを表示する関数
  const renderYouTubeChannelLink = (): JSX.Element | null => {
    // 表示フラグがない、またはURLがない場合はnull
    if (!showYouTubeLink || !user.channel_url) return null;
    // 基本的なURLバリデーション
    if (!user.channel_url.startsWith('http://') && !user.channel_url.startsWith('https://')) {
        console.warn("Invalid channel URL:", user.channel_url);
        return null; // 無効なURLは表示しない
    }
    // <a> タグを返す
    return (
      <a // JSX開始
        href={user.channel_url} // href属性
        target="_blank" // target属性
        rel="noopener noreferrer" // rel属性
        className="mt-2 inline-flex items-center text-xs text-red-600 hover:text-red-700 transition-colors" // className属性
      >
        <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
        YouTubeチャンネルを見る
      </a> // JSX終了
    );
  };

  // 視聴傾向を表示する関数
  const renderViewingTrends = (): JSX.Element | null => {
    // 詳細表示が有効でない、またはデータがない場合はnull
    if (!showDetails || !user.viewing_trends || Object.keys(user.viewing_trends).length === 0) return null;

    return (
      <div className="mt-4 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <FontAwesomeIcon icon={faEye} className="mr-2 text-teal-500" />
          視聴傾向
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          {/* Object.entriesでキーと値を取得し、mapで表示 */}
          {Object.entries(user.viewing_trends).map(([genre, percentage], index) => (
            <div key={index} className="flex items-center">
              <span className="w-24 truncate text-xs" title={genre}>{genre}</span>
              <div className="ml-2 flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  // パーセンテージを0-100の範囲に収める
                  style={{ width: `${Math.max(0, Math.min(100, percentage as number))}%` }}
                />
              </div>
              <span className="ml-2 text-xs w-8 text-right">{Math.round(percentage as number)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 共通の友達を表示する関数
  const renderCommonFriends = (): JSX.Element | null => {
    // 詳細表示が有効でない、またはデータがない場合はnull
    if (!showDetails || !user.common_friends || user.common_friends.length === 0) return null;

    return (
      <div className="mt-4 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <FontAwesomeIcon icon={faUserFriends} className="mr-2 text-indigo-500" />
          共通の友達: {user.common_friends.length}人
        </h3>
        <div className="flex -space-x-2 overflow-hidden">
          {/* 最初の5人を表示 */}
          {user.common_friends.slice(0, 5).map((friend: any, index: number) => ( // friendの型をanyに（より具体的にできれば尚良し）
            <img
              key={friend.id || index} // 可能であれば friend.id を使う
              className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
              src={friend.avatar_url || defaultAvatar} // アバターがなければデフォルト
              alt={friend.username || '友達'}
              onError={(e) => { // 画像読み込みエラー時の処理
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // 再帰ループを防ぐ
                  target.src = defaultAvatar; // デフォルト画像に差し替え
              }}
              loading="lazy" // 遅延読み込み
            />
          ))}
          {/* 5人より多い場合は残り人数を表示 */}
          {user.common_friends.length > 5 && (
            <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-xs font-medium text-gray-700 ring-2 ring-white">
              +{user.common_friends.length - 5}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 動画リストの展開/折りたたみを切り替える関数
  const toggleExpandedVideos = (): void => {
    setExpandedVideos(!expandedVideos); // Stateを反転
  };

  // 共通の視聴動画を表示する関数
  const renderCommonVideos = (): JSX.Element | null => {
    // commonVideos 配列自体が存在し中身があるか、または common_videos_count が 0 より大きいか
    const hasCommonVideosData = (commonVideos && commonVideos.length > 0) || (user.common_videos_count && user.common_videos_count > 0);
    if (!hasCommonVideosData) return null; // データがなければ表示しない

    // 利用可能な動画データ (commonVideos があればそれ、なければ空配列)
    const availableVideos = commonVideos || [];
    // 表示する動画の総数 (availableVideos の長さ、または user.common_videos_count)
    const videoCount = availableVideos.length || user.common_videos_count || 0;
    // 表示する動画リスト (折りたたみ状態を考慮)
    const displayVideos = expandedVideos ? availableVideos : availableVideos.slice(0, 3);
    // 詳細情報を表示すべきか (showDetailsフラグ or スコアが高い場合など)
    const shouldShowDetails = showDetails || (similarityScore && similarityScore > 70); // similarityScore を参照

    return (
      <div className="mb-4 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <FontAwesomeIcon icon={faVideo} className="mr-2 text-purple-500" />
          共通の視聴動画: {videoCount}本 {/* videoCount を使用 */}
        </h3>

        {/* 詳細表示が必要で、かつ実際に表示できる動画データがある場合 */}
        {shouldShowDetails && availableVideos.length > 0 && (
          <>
            <div className="mt-2 space-y-2">
              {/* displayVideos を map でループ */}
              {displayVideos.map((video: VideoDetails) => ( // video を引数として受け取る
                <a // JSX開始 (aタグ)
                  key={video.id} // key 属性
                  href={`https://www.youtube.com/watch?v=${video.youtube_id}`} // href 属性
                  target="_blank" // target 属性
                  rel="noopener noreferrer" // rel 属性
                  className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded transition-colors group" // className 属性
                >
                  <img
                    src={video.thumbnail_url} // video.thumbnail_url を使用
                    alt={video.title} // video.title を使用
                    className="w-16 h-10 object-cover rounded flex-shrink-0"
                    loading="lazy" // 遅延読み込み
                  />
                  <div className="flex-1 overflow-hidden">
                    <span className="text-xs font-medium text-gray-800 group-hover:text-indigo-600 line-clamp-2 leading-tight">
                      {video.title} {/* video.title を使用 */}
                    </span>
                    {video.channel_name && ( // video.channel_name があれば表示
                      <span className="text-xs text-gray-500 block truncate">
                        {video.channel_name} {/* video.channel_name を使用 */}
                      </span>
                    )}
                  </div>
                </a> // JSX終了 (aタグ)
              ))} {/* map 終了 */}
            </div> {/* space-y-2 終了 */}

            {/* 3件より多く動画がある場合に「もっと見る/折りたたむ」ボタンを表示 */}
            {availableVideos.length > 3 && (
              <button
                onClick={toggleExpandedVideos} // クリックハンドラー
                className="text-xs text-indigo-600 hover:text-indigo-800 mt-2 focus:outline-none"
              >
                {/* expandedVideos フラグで表示テキストを切り替え */}
                {expandedVideos ? '▲ 折りたたむ' : `▼ 他 ${availableVideos.length - 3} 件の共通視聴動画を見る`}
              </button>
            )}
          </> // Fragment終了
        )}

        {/* 詳細表示が必要ないが、共通動画があることを示唆する場合 (任意) */}
        {!shouldShowDetails && videoCount > 0 && (
             <p className="text-xs text-gray-500 mt-1">共通の視聴動画があります。</p> // pタグで囲む
        )}
      </div> // mb-4 終了
    );
  };


  // ユーザーのステータスを示すバッジ（例：認証済み女性）を表示する関数
  const renderUserStatusBadge = (): JSX.Element | null => {
    // 性別情報がない場合は表示しない
    if (!userGender) return null;
    // 認証済みの女性の場合
    if (userGender === 'female' && isPhoneVerified) { // userGender, isPhoneVerified を参照
      return (
        <div className="absolute top-2 left-2 bg-pink-400 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center shadow-sm z-10"> {/* z-index追加 */}
          <FontAwesomeIcon icon={faVenus} className="mr-1 w-3 h-3" />
          認証済み
        </div>
      );
    }
    // 他のステータスバッジが必要な場合はここに追加
    return null;
  };

  // カード全体のCSSクラスを決定する関数
  const getCardClasses = (): string => {
    let baseClasses = "w-full max-w-sm bg-white rounded-xl shadow-lg overflow-hidden relative transition-all duration-300 ease-in-out"; // max-w-sm に変更、relative追加
    let borderClasses = "";

    if (isMatchedUser) { // isMatchedUser を参照
      // マッチング済みの場合のボーダー
      borderClasses = " border-4 border-green-500 ring-4 ring-green-200";
    } else {
      // マッチングしていない場合、接続ステータスやいいね状態でボーダーを決定
        switch (connectionStatus) { // connectionStatus を参照
            case ConnectionStatus.CONNECTED: // Enumと比較
                borderClasses = " border-2 border-green-400";
                break;
            case ConnectionStatus.PENDING: // Enumと比較
                borderClasses = " border-2 border-blue-400";
                break;
            case ConnectionStatus.REJECTED: // Enumと比較
                borderClasses = " border-2 border-red-400";
                break;
            default:
                 // 接続リクエストがない場合、いいねされているかで判断
                 if (user.is_liked) { // user.is_liked を参照
                    borderClasses = " border-2 border-rose-400"; // いいね済み
                 } else {
                    borderClasses = " border border-gray-200"; // デフォルト
                 }
        }
    }
    return `${baseClasses}${borderClasses}`; // 基本クラスとボーダークラスを結合
  };

  // アクションボタン（いいね/スキップ または メッセージ）を表示する関数
  const renderActionButtons = (): JSX.Element => {
    if (isMatchedUser || connectionStatus === ConnectionStatus.CONNECTED) { // マッチング済みか接続済みの場合
      // メッセージボタンを表示
      return (
        <div className="mt-6 flex justify-center">
          <Link 
            to={`/messages?user_id=${user.id}`} 
            className="flex items-center justify-center w-full sm:w-auto px-6 py-2 bg-green-500 text-white font-semibold rounded-lg transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm"
          >
            <FontAwesomeIcon icon={faComments} className="mr-2" />
            メッセージを送る
          </Link>
        </div>
      );
    }

    // --- マッチングしていないユーザーの場合 ---
    return (
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* スキップボタン */}
        <button
          onClick={handleSkip} // handleSkip を参照
          disabled={isProcessing} // isProcessing を参照
          className={`flex items-center justify-center py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors text-sm ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400'
          }`}
        >
          <FontAwesomeIcon icon={faForward} className="mr-2" />
          スキップ
        </button>
        {/* いいねボタン */}
        <button
          onClick={handleLike} // handleLike を参照
          // 処理中 または 既にいいね済み(user.is_liked) の場合は無効
          disabled={isProcessing || user.is_liked} // isProcessing, user.is_liked を参照
          className={`flex items-center justify-center py-2 px-4 font-semibold rounded-lg transition-colors text-sm ${
            user.is_liked // user.is_liked でスタイルを切り替え
              ? 'bg-rose-300 text-white cursor-not-allowed' // いいね済みスタイル
              : 'bg-rose-500 text-white hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500' // 通常スタイル
          } ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : '' // 処理中スタイルを追記
          }`}
        >
          <FontAwesomeIcon icon={faThumbsUp} className="mr-2" />
          {/* ボタンテキストを状態に応じて切り替え */}
         {isProcessing ? '処理中...' : user.is_liked ? 'いいね済み' : 'いいね！'}
       </button>
     </div>
   );
 };

 // マッチング済みバッジを表示する関数
 const renderMatchedBadge = (): JSX.Element | null => {
   if (!isMatchedUser) return null; // isMatchedUser を参照
   return (
     <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold z-20 shadow"> {/* z-index調整 */}
       <FontAwesomeIcon icon={faHandshake} className="mr-1" />
       マッチング済み
     </div>
   );
 };

 // カードヘッダー（背景グラデーションとアバター）を表示する関数
 const renderCardHeader = (): JSX.Element => (
    <div className="relative h-48 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
       {/* プレミアム会員バッジ */}
       {user.is_premium && ( // user.is_premium を参照
         <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-0.5 rounded-full text-xs font-semibold flex items-center shadow-sm z-10"> {/* z-index追加 */}
           <FontAwesomeIcon icon={faCrown} className="mr-1 w-3 h-3" />
           Premium
         </div>
       )}
       {/* いいね済みバッジ (マッチング前 かつ 接続前 のみ表示) */}
       {user.is_liked && !isMatchedUser && connectionStatus !== ConnectionStatus.CONNECTED && ( // user.is_liked, isMatchedUser, connectionStatus を参照
          <div className="absolute top-2 left-2 bg-rose-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center shadow-sm z-10"> {/* z-index追加 */}
            <FontAwesomeIcon icon={faHeart} className="mr-1 w-3 h-3" />
            いいね！
          </div>
       )}
       {/* 認証済み女性バッジ */}
       {renderUserStatusBadge()}
       {/* アバター */}
       <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-10"> {/* z-index修正 */}
         <img
           src={user.avatar_url || defaultAvatar} // user.avatar_url, defaultAvatar を参照
           alt={`${user.username || 'ユーザー'}のアバター`} // user.username を参照
           className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg"
           onError={(e) => { // 画像読み込みエラーハンドラー
             const target = e.target as HTMLImageElement;
             target.onerror = null; // 無限ループ防止
             target.src = defaultAvatar; // defaultAvatar を参照
           }}
           loading="lazy" // 遅延読み込み
         />
       </div>
     </div>
 );

 // カードボディ（メインコンテンツ）を表示する関数
 const renderCardBody = (): JSX.Element => (
   <div className="p-6 pt-16"> {/* アバターが重なるためptを増やす */}
       <div className="text-center mb-4">
         {/* ユーザー名 */}
         <h2 className="text-xl font-bold text-gray-800 truncate" title={user.username || '名前なし'}>
           {user.username || '名前なし'} {/* user.username を参照 */}
         </h2>
         {/* 年齢と居住地 */}
         {(displayAge || displayLocation) && ( // displayAge, displayLocation を参照
           <div className="flex justify-center items-center text-gray-600 text-sm mt-1 space-x-2">
             {displayAge && <span>{displayAge}</span>} {/* displayAge を参照 */}
             {displayAge && displayLocation && <span>/</span>} {/* displayAge, displayLocation を参照 */}
             {displayLocation && ( // displayLocation を参照
               <span className="flex items-center">
                 <FontAwesomeIcon icon={faLocationDot} className="mr-1" />
                 {displayLocation} {/* displayLocation を参照 */}
               </span>
             )}
           </div>
         )}
          {/* オンラインステータス */}
          {getOnlineStatus() && <div className="mt-1">{getOnlineStatus()}</div>} {/* getOnlineStatus を参照 */}
          {/* YouTubeリンク */}
          {renderYouTubeChannelLink()} {/* renderYouTubeChannelLink を参照 */}
       </div>

       {/* マッチスコア */}
       {/* user.matching_score または similarityScore を使用 */}
       <div className={`flex items-center justify-center mb-4 text-lg font-bold ${getMatchScoreColor(user.matching_score || similarityScore || 0)}`}>
         <FontAwesomeIcon icon={faPercent} className="mr-1" />
         <span>
           {Math.round(user.matching_score || similarityScore || 0)}% Match {/* user.matching_score, similarityScore を参照 */}
         </span>
       </div>

       {/* 自己紹介 */}
       <p className="text-gray-600 text-sm mb-4 text-center min-h-[3rem] line-clamp-3">
         {user.bio || '自己紹介はまだありません。'} {/* user.bio を参照 */}
       </p>

       {/* 活動レベル */}
       {user.activity_level !== undefined && ( // user.activity_level を参照
         <div className="mb-4 flex items-center justify-center text-sm">
           {/* user.activity_level を getActivityLevelColor に渡す */}
           <FontAwesomeIcon icon={faClock} className={`mr-1.5 ${getActivityLevelColor(user.activity_level)}`} />
           <span>
             活動レベル：
             {/* user.activity_level を getActivityLevelColor と getActivityLevelText に渡す */}
             <span className={`font-medium ${getActivityLevelColor(user.activity_level)}`}>
               {getActivityLevelText(user.activity_level)}
             </span>
           </span>
         </div>
       )}

       {/* 共通の興味 */}
       {user.common_interests && user.common_interests.length > 0 && ( // user.common_interests を参照
         <div className="mb-4 border-t pt-4">
           <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
             <FontAwesomeIcon icon={faHeart} className="mr-2 text-rose-500" />
             共通の興味
           </h3>
           <div className="flex flex-wrap gap-1.5">
             {user.common_interests.slice(0, 5).map((interest: string, index: number) => (
               <span key={index} className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs rounded-full font-medium">
                 {interest}
               </span>
             ))}
             {user.common_interests.length > 5 && (
               <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                 +{user.common_interests.length - 5} more
               </span>
             )}
           </div>
         </div>
       )}

       {/* 共通のジャンル */}
       {user.common_genres && user.common_genres.length > 0 && ( // user.common_genres を参照
         <div className="mb-4 border-t pt-4">
           <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
             <FontAwesomeIcon icon={faTag} className="mr-2 text-blue-500" />
             共通のジャンル
           </h3>
           <div className="flex flex-wrap gap-1.5">
             {user.common_genres.slice(0, 5).map((genre: string, index: number) => (
               <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                 {genre}
               </span>
             ))}
             {user.common_genres.length > 5 && (
               <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                 +{user.common_genres.length - 5} more
               </span>
             )}
           </div>
         </div>
       )}

       {/* 共通の興味・ジャンルがない場合に、ユーザー自身の興味を表示 */}
       {!hasCommonInterestsOrGenres && user.interests && user.interests.length > 0 && ( // hasCommonInterestsOrGenres, user.interests を参照
         <div className="mb-4 border-t pt-4">
           <h3 className="text-sm font-semibold text-gray-700 mb-2">興味・関心</h3>
           <div className="flex flex-wrap gap-1.5">
             {user.interests.slice(0, 5).map((interest: string, index: number) => (
               <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                 {interest}
               </span>
             ))}
             {user.interests.length > 5 && (
               <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                 +{user.interests.length - 5} more
               </span>
             )}
           </div>
         </div>
       )}

       {/* 共通動画、視聴傾向、共通の友達 */}
       {renderCommonVideos()} {/* renderCommonVideos を参照 */}
       {renderViewingTrends()} {/* renderViewingTrends を参照 */}
       {renderCommonFriends()} {/* renderCommonFriends を参照 */}

       {/* エラーメッセージ表示 */}
       {error && ( // error を参照
         <div className="mt-4 p-2 bg-red-100 text-red-700 text-sm rounded text-center">
           {error} {/* error を参照 */}
         </div>
       )}

       {/* 詳細プロフィールを見るボタン */}
       {/* hasDetailedView=true, onViewProfile関数あり, まだ詳細表示されていない場合 */}
       {hasDetailedView && onViewProfile && !showDetails && ( // hasDetailedView, onViewProfile, showDetails を参照
         <div className="mt-4 border-t pt-4">
           <button
             onClick={handleViewProfile} // handleViewProfile を参照
             disabled={isProcessing} // isProcessing を参照
             className={`w-full py-2 px-4 flex items-center justify-center bg-purple-500 text-white font-semibold rounded-lg transition-colors text-sm ${
               isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
             }`}
           >
             {/* isProcessing, isFreeProfileView でテキストを切り替え */}
             {isProcessing ? '読込中...' :
              isFreeProfileView ? '詳細プロフィールを見る' : '詳細プロフィールを見る (要Pt)'}
           </button>
           {/* 無料表示の注釈 */}
           {isFreeProfileView && ( // isFreeProfileView を参照
             <p className="text-xs text-center mt-1 text-purple-600">
               {/* isPremium でテキストを切り替え */}
               {isPremium ? 'プレミアム会員特典' : '認証済み女性特典'} - ポイント消費なし
             </p>
           )}
           {/* 有料表示の注釈 */}
           {!isFreeProfileView && !isPremium && ( // isFreeProfileView, isPremium を参照
               <p className="text-xs text-center mt-1 text-gray-500">
                 詳細表示にはポイントが必要です。
               </p>
           )}
         </div>
       )}

       {/* 接続リクエスト応答ボタン（受信者用） */}
       {renderConnectionResponseButtons()} {/* renderConnectionResponseButtons を参照 */}

       {/* つながるリクエストボタン (マッチング前、プレミアム会員向け) */}
       {!isMatchedUser && renderConnectionButton()} {/* isMatchedUser, renderConnectionButton を参照 */}

       {/* アクションボタン (いいね/スキップ または メッセージ) */}
       {renderActionButtons()} {/* renderActionButtons を参照 */}

       {/* プレミアム会員/認証 促進メッセージ */}
       {/* 無料表示でなく、マッチング前の場合 */}
       {!isFreeProfileView && !isMatchedUser && ( // isFreeProfileView, isMatchedUser を参照
         <div className="mt-4 p-2 bg-yellow-50 text-xs text-amber-700 rounded-lg text-center">
           {/* userGender でテキストを切り替え */}
           {userGender === 'female' ?
             'ヒント: 電話番号認証で機能制限が解除されます✨' :
             'ヒント: プレミアム会員で全ての機能が利用可能に👑'}
         </div>
       )}
     </div> // p-6 pt-16 終了
 );

 // --- コンポーネントの最終的なJSX ---
 return (
   <div className={getCardClasses()}> {/* getCardClasses を参照 */}
     {/* マッチング済みバッジ (カード上部に表示) */}
     {renderMatchedBadge()} {/* renderMatchedBadge を参照 */}
     {/* 接続ステータスバッジ (マッチング前) */}
     {!isMatchedUser && connectionStatus !== ConnectionStatus.NONE && ( // isMatchedUser, connectionStatus を参照
       <div className={`absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full font-semibold text-xs shadow-sm ${
         // connectionStatus でスタイルとテキストを切り替え
         connectionStatus === ConnectionStatus.CONNECTED ? 'bg-green-100 text-green-800' :
         connectionStatus === ConnectionStatus.PENDING ? 'bg-blue-100 text-blue-800' :
         'bg-red-100 text-red-800' // REJECTED の場合
       }`}>
         {connectionStatus === ConnectionStatus.CONNECTED ? 'つながり済み' :
          connectionStatus === ConnectionStatus.PENDING ? (user.is_initiator ? 'リクエスト送信済み' : 'リクエスト受信中') : // 送信者/受信者でテキスト変更
          '接続できません'}
       </div>
     )}

     {/* カードヘッダー */}
     {renderCardHeader()} {/* renderCardHeader を参照 */}
     {/* カードボディ */}
     {renderCardBody()} {/* renderCardBody を参照 */}
   </div> // カード全体 div 終了
 );
}; // UserCard コンポーネント終了

export default UserCard; // エクスポート