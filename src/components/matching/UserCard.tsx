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
  faVenus,
  faHandshake,
  faComments  // <--- faComments アイコンを追加
} from '@fortawesome/free-solid-svg-icons';
import { MatchingUser, VideoDetails, OnlineStatus, ActivityLevel, ConnectionStatus } from '@/types/matching';
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Link } from 'react-router-dom'; // 明示的にインポート

interface UserCardProps {
  user: MatchingUser;
  onLike: (userId: string) => Promise<boolean>;
  onSkip: (userId: string) => Promise<boolean>;
  onViewProfile?: (userId: string) => Promise<void>;
  onConnect?: (userId: string) => Promise<boolean>;
  commonVideos?: VideoDetails[];
  isPremium?: boolean;
  hasDetailedView?: boolean;
  similarityScore?: number;
  showYouTubeLink?: boolean;
  userGender?: string | null;
  isPhoneVerified?: boolean;
  isMatchedUser?: boolean;
}

// FC<UserCardProps> と :ReactNode を削除し、引数に直接型付け（前回の推奨事項を適用）
const UserCard = ({
  user,
  onLike,
  onSkip,
  onViewProfile,
  onConnect,
  commonVideos = [],
  isPremium = false,
  hasDetailedView = false,
  similarityScore,
  showYouTubeLink = false,
  userGender = null,
  isPhoneVerified = false,
  isMatchedUser = false
}: UserCardProps): JSX.Element => { // 戻り値の型を JSX.Element に変更
  const defaultAvatar = '/default-avatar.jpg';
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [expandedVideos, setExpandedVideos] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(user.connection_status || ConnectionStatus.NONE);

  useEffect(() => {
    // connection_status が外部から変更された場合に内部状態を更新
    if (user.connection_status !== connectionStatus) {
      setConnectionStatus(user.connection_status || ConnectionStatus.NONE);
    }
  }, [user.connection_status, connectionStatus]); // connectionStatus も依存配列に追加

  const isFreeProfileView = isPremium || (userGender === 'female' && isPhoneVerified);

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const getActivityLevelText = (level?: ActivityLevel | number) => {
    if (level === undefined) return '不明';
    if (typeof level === 'number') {
      if (level >= 8) return '非常に活発';
      if (level >= 6) return '活発';
      if (level >= 4) return '普通';
      if (level >= 2) return 'やや静か';
      return '静か';
    }
    switch (level) {
      case ActivityLevel.VERY_ACTIVE: return '非常に活発';
      case ActivityLevel.ACTIVE: return '活発';
      case ActivityLevel.MODERATE: return '普通';
      case ActivityLevel.CASUAL: return 'カジュアル';
      default: return '不明';
    }
  };

  const getActivityLevelColor = (level?: ActivityLevel | number) => {
    if (level === undefined) return 'text-gray-500';
    if (typeof level === 'number') {
      if (level >= 8) return 'text-green-600';
      if (level >= 6) return 'text-green-500';
      if (level >= 4) return 'text-blue-500';
      if (level >= 2) return 'text-yellow-500';
      return 'text-gray-500';
    }
    switch (level) {
      case ActivityLevel.VERY_ACTIVE: return 'text-green-600';
      case ActivityLevel.ACTIVE: return 'text-green-500';
      case ActivityLevel.MODERATE: return 'text-blue-500';
      case ActivityLevel.CASUAL: return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getOnlineStatus = () => {
    if (!user.online_status) return null;
    if (user.online_status === OnlineStatus.ONLINE) {
      return (
        <span className="inline-flex items-center text-green-600 text-xs">
          <span className="w-2 h-2 bg-green-600 rounded-full mr-1"></span>
          オンライン
        </span>
      );
    }
    if (user.last_active) {
      // Date オブジェクトへの変換を試みる (無効な日付文字列対策)
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
    return null;
  };

  const displayAge = user.age ? `${user.age}歳` : '';
  // location の型チェックをより安全に
  const displayLocation = typeof user.location === 'object' && user.location !== null && 'prefecture' in user.location && user.location.prefecture
    ? user.location.prefecture
    : (typeof user.location === 'string' ? user.location : '');

  const handleLike = async () => {
    if (isProcessing) return;
    setIsProcessing(true); setError(null);
    try {
      const success = await onLike(user.id);
      if (!success) setError('処理に失敗しました。もう一度お試しください。');
      // Note: 成功した場合、親コンポーネントがユーザーリストを更新することを期待
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error('いいね処理でエラー:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (isProcessing) return;
    setIsProcessing(true); setError(null);
    try {
      const success = await onSkip(user.id);
      if (!success) setError('処理に失敗しました。もう一度お試しください。');
      // Note: 成功した場合、親コンポーネントがユーザーリストを更新することを期待
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error('スキップ処理でエラー:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConnect = async () => {
    if (!onConnect || isProcessing) return;
    setIsProcessing(true); setError(null);
    try {
      const success = await onConnect(user.id);
      if (success) {
        // 成功した場合、ローカルの状態を更新して即時フィードバック
        setConnectionStatus(ConnectionStatus.PENDING);
      } else {
        setError('接続リクエストの送信に失敗しました。');
      }
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error('接続リクエスト送信でエラー:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewProfile = async () => {
    if (!onViewProfile || isProcessing) return;
    setIsProcessing(true); setError(null);
    try {
      await onViewProfile(user.id);
      setShowDetails(true); // 詳細表示フラグを立てる
    } catch (err) {
      setError('プロフィールの取得に失敗しました。');
      console.error('プロフィール表示でエラー:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderConnectionButton = () => {
    // プレミアム会員でなくても接続ボタンを表示する可能性を考慮？
    // 一旦は isPremium チェックを残す
    if (!isPremium || !onConnect || isMatchedUser) return null; // マッチング済みなら接続ボタンは不要

    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return (
          <div className="mt-4">
            <span className="inline-flex items-center justify-center w-full py-2 bg-green-100 text-green-700 font-semibold rounded-lg text-sm">
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              つながり済み
            </span>
          </div>
        );
      case ConnectionStatus.PENDING:
        return (
          <div className="mt-4">
            <span className="inline-flex items-center justify-center w-full py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg text-sm">
              <FontAwesomeIcon icon={faHourglass} className="mr-2" />
              リクエスト送信済み
            </span>
          </div>
        );
      case ConnectionStatus.REJECTED:
        return (
          <div className="mt-4">
            <span className="inline-flex items-center justify-center w-full py-2 bg-red-100 text-red-700 font-semibold rounded-lg text-sm">
              <FontAwesomeIcon icon={faTimes} className="mr-2" />
              接続できません
            </span>
          </div>
        );
      case ConnectionStatus.NONE:
      default:
        return (
          <div className="mt-4">
            <button
              onClick={handleConnect}
              disabled={isProcessing}
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

  // 共通の興味またはジャンルがあるかどうか
  const hasCommonInterestsOrGenres =
    (user.common_interests && user.common_interests.length > 0) ||
    (user.common_genres && user.common_genres.length > 0);

  const renderYouTubeChannelLink = () => {
    if (!showYouTubeLink || !user.channel_url) return null;
    // URLの基本的なバリデーション
    if (!user.channel_url.startsWith('http://') && !user.channel_url.startsWith('https://')) {
        console.warn("Invalid channel URL:", user.channel_url);
        return null;
    }
    return (
      // 開始タグ <a> を追加 (前回の修正)
      <a
        href={user.channel_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center text-xs text-red-600 hover:text-red-700 transition-colors"
      >
        <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
        YouTubeチャンネルを見る
      </a>
    );
  };

  const renderViewingTrends = () => {
    // 詳細表示が有効で、かつ視聴傾向データが存在する場合のみ表示
    if (!showDetails || !user.viewing_trends || Object.keys(user.viewing_trends).length === 0) return null;
    return (
      <div className="mt-4 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <FontAwesomeIcon icon={faEye} className="mr-2 text-teal-500" />
          視聴傾向
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          {Object.entries(user.viewing_trends).map(([genre, percentage], index) => (
            <div key={index} className="flex items-center">
              <span className="w-24 truncate text-xs" title={genre}>{genre}</span>
              <div className="ml-2 flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} // 0-100% の範囲に制限
                />
              </div>
              <span className="ml-2 text-xs w-8 text-right">{Math.round(percentage)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCommonFriends = () => {
    // 詳細表示が有効で、かつ共通の友達データが存在する場合のみ表示
    if (!showDetails || !user.common_friends || user.common_friends.length === 0) return null;
    return (
      <div className="mt-4 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <FontAwesomeIcon icon={faUserFriends} className="mr-2 text-indigo-500" />
          共通の友達: {user.common_friends.length}人
        </h3>
        <div className="flex -space-x-2 overflow-hidden">
          {user.common_friends.slice(0, 5).map((friend, index) => (
            <img
              key={friend.id || index} // 可能であれば friend.id を使う
              className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
              src={friend.avatar_url || defaultAvatar}
              alt={friend.username || '友達'}
              onError={(e) => { // 個々の画像のロードエラー処理
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = defaultAvatar;
              }}
            />
          ))}
          {user.common_friends.length > 5 && (
            <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-xs font-medium text-gray-700 ring-2 ring-white">
              +{user.common_friends.length - 5}
            </div>
          )}
        </div>
      </div>
    );
  };

  const toggleExpandedVideos = () => {
    setExpandedVideos(!expandedVideos);
  };

  const renderCommonVideos = () => {
    // commonVideos 配列自体が存在し、中身があるか、または common_videos_count が 0 より大きいか
    const hasCommonVideosData = (commonVideos && commonVideos.length > 0) || (user.common_videos_count && user.common_videos_count > 0);
    if (!hasCommonVideosData) return null;

    // 表示する動画リスト。commonVideos があればそれ、なければ空配列
    const availableVideos = commonVideos || [];
    // 表示件数。availableVideos の長さ、または user.common_videos_count を使う
    const videoCount = availableVideos.length || user.common_videos_count || 0;
    // 表示する動画リスト（折りたたみ考慮）
    const displayVideos = expandedVideos ? availableVideos : availableVideos.slice(0, 3);
    // 詳細表示が必要かどうかのフラグ
    const shouldShowDetails = showDetails || (similarityScore && similarityScore > 70);

    return (
      <div className="mb-4 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <FontAwesomeIcon icon={faVideo} className="mr-2 text-purple-500" />
          共通の視聴動画: {videoCount}本
        </h3>

        {/* 詳細表示が必要で、かつ実際に表示できる動画データがある場合 */}
        {shouldShowDetails && availableVideos.length > 0 && (
          <>
            <div className="mt-2 space-y-2">
              {displayVideos.map((video) => (
                // 開始タグ <a> を追加 (前回の修正)
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded transition-colors group"
                >
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-16 h-10 object-cover rounded flex-shrink-0"
                    loading="lazy" // 遅延読み込み
                  />
                  <div className="flex-1 overflow-hidden">
                    <span className="text-xs font-medium text-gray-800 group-hover:text-indigo-600 line-clamp-2 leading-tight">
                      {video.title}
                    </span>
                    {video.channel_name && (
                      <span className="text-xs text-gray-500 block truncate">
                        {video.channel_name}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>

            {/* 3件より多く動画がある場合に「もっと見る/折りたたむ」ボタンを表示 */}
            {availableVideos.length > 3 && (
              <button
                onClick={toggleExpandedVideos}
                className="text-xs text-indigo-600 hover:text-indigo-800 mt-2 focus:outline-none"
              >
                {expandedVideos ? '▲ 折りたたむ' : `▼ 他 ${availableVideos.length - 3} 件の共通視聴動画を見る`}
              </button>
            )}
          </>
        )}
        {/* 詳細表示が必要ないが、共通動画があることを示唆する場合 (任意) */}
        {!shouldShowDetails && videoCount > 0 && (
             <p className="text-xs text-gray-500 mt-1">共通の視聴動画があります。</p>
        )}
      </div>
    );
  };

  const renderUserStatusBadge = () => {
    if (!userGender) return null;
    // 認証済み女性バッジ
    if (userGender === 'female' && isPhoneVerified) {
      return (
        <div className="absolute top-2 left-2 bg-pink-400 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center shadow-sm">
          <FontAwesomeIcon icon={faVenus} className="mr-1 w-3 h-3" />
          認証済み
        </div>
      );
    }
    // 他のステータスバッジが必要な場合はここに追加
    return null;
  };

  const getCardClasses = () => {
    let baseClasses = "w-full max-w-sm bg-white rounded-xl shadow-lg overflow-hidden relative transition-all duration-300 ease-in-out"; // max-w-sm に変更、relative追加
    let borderClasses = "";

    if (isMatchedUser) {
      borderClasses = " border-4 border-green-500 ring-4 ring-green-200"; // マッチングを強調
    } else {
        switch (connectionStatus) {
            case ConnectionStatus.CONNECTED:
                borderClasses = " border-2 border-green-400";
                break;
            case ConnectionStatus.PENDING:
                borderClasses = " border-2 border-blue-400";
                break;
            case ConnectionStatus.REJECTED:
                borderClasses = " border-2 border-red-400";
                break;
            default:
                 // is_liked が true で、まだマッチングしていない場合
                 if (user.is_liked) {
                    borderClasses = " border-2 border-rose-400"; // いいね済みをボーダーで示す
                 } else {
                    borderClasses = " border border-gray-200"; // デフォルトボーダー
                 }
        }
    }
    return `${baseClasses}${borderClasses}`;
  };

  // --- 修正対象の関数 ---
  const renderActionButtons = () => {
    if (isMatchedUser) {
      // マッチング済みユーザーの場合
      if (user.conversation_id) {
        // 会話IDがある場合はメッセージページへのリンクを表示
        return (
          <div className="mt-6 flex justify-center">
            <Link
              to={`/messages/${user.conversation_id}`}
              className="flex items-center justify-center w-full sm:w-auto px-6 py-2 bg-green-500 text-white font-semibold rounded-lg transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm"
            >
              {/* アイコンを faComments に変更 */}
              <FontAwesomeIcon icon={faComments} className="mr-2" />
              メッセージを送る
            </Link>
          </div>
        );
      } else {
        // 会話IDがない場合は無効化されたボタンを表示
        return (
          <div className="mt-6 flex justify-center">
            <span // ボタンではなく span など、クリックできない要素にする
              className="flex items-center justify-center w-full sm:w-auto px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg cursor-not-allowed opacity-70 text-sm"
            >
              {/* アイコンを faComments に変更 */}
              <FontAwesomeIcon icon={faComments} className="mr-2" />
              会話準備中
            </span>
          </div>
        );
      }
    }

    // マッチングしていないユーザーの場合（スキップといいね）
    return (
      <div className="mt-6 grid grid-cols-2 gap-4">
        <button
          onClick={handleSkip}
          disabled={isProcessing}
          className={`flex items-center justify-center py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors text-sm ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400'
          }`}
        >
          <FontAwesomeIcon icon={faForward} className="mr-2" />
          スキップ
        </button>
        <button
          onClick={handleLike}
          disabled={isProcessing || user.is_liked} // 既にいいね済みの場合も無効化
          className={`flex items-center justify-center py-2 px-4 font-semibold rounded-lg transition-colors text-sm ${
            user.is_liked
              ? 'bg-rose-300 text-white cursor-not-allowed' // いいね済みスタイル
              : 'bg-rose-500 text-white hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500' // 通常のいいねボタンスタイル
          } ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : '' // 処理中スタイル
          }`}
        >
          <FontAwesomeIcon icon={faThumbsUp} className="mr-2" />
          {/* 処理中 > いいね済み > 通常 の優先順位でテキスト表示 */}
          {isProcessing ? '処理中...' : user.is_liked ? 'いいね済み' : 'いいね！'}
        </button>
      </div>
    );
  };
  // --- 修正ここまで ---

  const renderMatchedBadge = () => {
    if (!isMatchedUser) return null;
    return (
      // バッジのスタイル調整
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold z-20 shadow">
        <FontAwesomeIcon icon={faHandshake} className="mr-1" />
        マッチング済み
      </div>
    );
  };

  // ヘッダー部分のグラデーション背景とアバター
  const renderCardHeader = () => (
     <div className="relative h-48 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        {/* プレミアムバッジ */}
        {user.is_premium && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-0.5 rounded-full text-xs font-semibold flex items-center shadow-sm">
            <FontAwesomeIcon icon={faCrown} className="mr-1 w-3 h-3" />
            Premium
          </div>
        )}
        {/* いいね済みバッジ (マッチング前のみ表示) */}
        {user.is_liked && !isMatchedUser && connectionStatus !== ConnectionStatus.CONNECTED && (
           <div className="absolute top-2 left-2 bg-rose-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center shadow-sm">
             <FontAwesomeIcon icon={faHeart} className="mr-1 w-3 h-3" />
             いいね！
           </div>
        )}
        {/* 認証済み女性バッジ */}
        {renderUserStatusBadge()}
        {/* アバター */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-10">
          <img
            src={user.avatar_url || defaultAvatar}
            alt={`${user.username || 'ユーザー'}のアバター`}
            className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = defaultAvatar;
            }}
            loading="lazy" // 遅延読み込み
          />
        </div>
      </div>
  );

  // メインコンテンツ部分
  const renderCardBody = () => (
    <div className="p-6 pt-16"> {/* アバターが重なるためptを増やす */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 truncate" title={user.username || '名前なし'}>
            {user.username || '名前なし'}
          </h2>
          {(displayAge || displayLocation) && (
            <div className="flex justify-center items-center text-gray-600 text-sm mt-1 space-x-2">
              {displayAge && <span>{displayAge}</span>}
              {displayAge && displayLocation && <span>/</span>}
              {displayLocation && (
                <span className="flex items-center">
                  <FontAwesomeIcon icon={faLocationDot} className="mr-1" />
                  {displayLocation}
                </span>
              )}
            </div>
          )}
           {/* オンラインステータス */}
           {getOnlineStatus() && <div className="mt-1">{getOnlineStatus()}</div>}
           {/* YouTubeリンク */}
           {renderYouTubeChannelLink()}
        </div>

        {/* マッチスコア */}
        <div className={`flex items-center justify-center mb-4 text-lg font-bold ${getMatchScoreColor(user.matching_score || similarityScore || 0)}`}>
          <FontAwesomeIcon icon={faPercent} className="mr-1" />
          <span>
            {Math.round(user.matching_score || similarityScore || 0)}% Match
          </span>
        </div>

        {/* 自己紹介 */}
        <p className="text-gray-600 text-sm mb-4 text-center min-h-[3rem] line-clamp-3">
          {user.bio || '自己紹介はまだありません。'}
        </p>

        {/* 活動レベル */}
        {user.activity_level !== undefined && (
          <div className="mb-4 flex items-center justify-center text-sm">
            <FontAwesomeIcon icon={faClock} className={`mr-1.5 ${getActivityLevelColor(user.activity_level)}`} />
            <span>
              活動レベル：
              <span className={`font-medium ${getActivityLevelColor(user.activity_level)}`}>
                {getActivityLevelText(user.activity_level)}
              </span>
            </span>
          </div>
        )}

        {/* 共通の興味 */}
        {user.common_interests && user.common_interests.length > 0 && (
          <div className="mb-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <FontAwesomeIcon icon={faHeart} className="mr-2 text-rose-500" />
              共通の興味
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {user.common_interests.slice(0, 5).map((interest, index) => (
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
        {user.common_genres && user.common_genres.length > 0 && (
          <div className="mb-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <FontAwesomeIcon icon={faTag} className="mr-2 text-blue-500" />
              共通のジャンル
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {user.common_genres.slice(0, 5).map((genre, index) => (
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
        {!hasCommonInterestsOrGenres && user.interests && user.interests.length > 0 && (
          <div className="mb-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">興味・関心</h3>
            <div className="flex flex-wrap gap-1.5">
                <>
                  {user.interests.slice(0, 5).map((interest, index) => (
                    <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                      {interest}
                    </span>
                  ))}
                  {user.interests.length > 5 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                      +{user.interests.length - 5} more
                    </span>
                  )}
                </>
            </div>
          </div>
        )}

        {/* 共通動画、視聴傾向、共通の友達 (詳細表示が有効な場合) */}
        {renderCommonVideos()}
        {renderViewingTrends()}
        {renderCommonFriends()}


        {/* エラーメッセージ */}
        {error && (
          <div className="mt-4 p-2 bg-red-100 text-red-700 text-sm rounded text-center">
            {error}
          </div>
        )}

        {/* 詳細プロフィールボタン */}
        {hasDetailedView && onViewProfile && !showDetails && (
          <div className="mt-4 border-t pt-4">
            <button
              onClick={handleViewProfile}
              disabled={isProcessing}
              className={`w-full py-2 px-4 flex items-center justify-center bg-purple-500 text-white font-semibold rounded-lg transition-colors text-sm ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
              }`}
            >
              {isProcessing ? '読込中...' :
               isFreeProfileView ? '詳細プロフィールを見る' : '詳細プロフィールを見る (要Pt)'}
            </button>
            {/* 無料表示の注釈 */}
            {isFreeProfileView && (
              <p className="text-xs text-center mt-1 text-purple-600">
                {isPremium ? 'プレミアム会員特典' : '認証済み女性特典'} - ポイント消費なし
              </p>
            )}
             {/* 有料表示の注釈 (ポイント数など、必要に応じて表示) */}
            {!isFreeProfileView && !isPremium && (
                 <p className="text-xs text-center mt-1 text-gray-500">
                    詳細表示にはポイントが必要です。
                 </p>
            )}
          </div>
        )}

        {/* つながるリクエストボタン (マッチング前、プレミアム会員向け) */}
        {!isMatchedUser && renderConnectionButton()}

        {/* アクションボタン (いいね/スキップ または メッセージ) */}
        {renderActionButtons()}

        {/* プレミアム会員/認証 促進メッセージ (マッチング前、無料表示でない場合) */}
        {!isFreeProfileView && !isMatchedUser && (
          <div className="mt-4 p-2 bg-yellow-50 text-xs text-amber-700 rounded-lg text-center">
            {userGender === 'female' ?
              'ヒント: 電話番号認証で機能制限が解除されます✨' :
              'ヒント: プレミアム会員で全ての機能が利用可能に👑'}
          </div>
        )}
      </div>
  );

  return (
    <div className={getCardClasses()}>
      {/* マッチング済みバッジ (カード上部に表示) */}
      {renderMatchedBadge()}
      {/* 接続ステータスバッジ (マッチング前) */}
      {!isMatchedUser && connectionStatus !== ConnectionStatus.NONE && (
        <div className={`absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full font-semibold text-xs shadow-sm ${
          connectionStatus === ConnectionStatus.CONNECTED ? 'bg-green-100 text-green-800' :
          connectionStatus === ConnectionStatus.PENDING ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800' // REJECTED の場合
        }`}>
          {connectionStatus === ConnectionStatus.CONNECTED ? 'つながり済み' :
           connectionStatus === ConnectionStatus.PENDING ? 'リクエスト中' :
           '接続できません'}
        </div>
      )}

      {renderCardHeader()}
      {renderCardBody()}
    </div>
  );
};

export default UserCard;