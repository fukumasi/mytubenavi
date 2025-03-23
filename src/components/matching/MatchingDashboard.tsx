// src/components/matching/MatchingDashboard.tsx

import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import MatchPreferences from './MatchPreferences';
import UserCard from './UserCard';
import { toast, Toaster } from 'react-hot-toast';
import useMatching from '../../hooks/useMatching';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCoins, 
  faCog, 
  faRedo, 
  faHistory, 
  faInfoCircle, 
  faUsers, 
  faFire,
  faArrowLeft,
  faCalendarAlt,
  faFilm,
  faChartBar,
  faLayerGroup,
  faUserFriends,
  faBrain
} from '@fortawesome/free-solid-svg-icons';
import { SkippedUser, VideoDetails } from '../../types/matching';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

const MatchingDashboard: React.FC = () => {
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [showDetailedView, setShowDetailedView] = useState<boolean>(false);
  const [commonVideos, setCommonVideos] = useState<VideoDetails[]>([]);
  const [skippedUsers, setSkippedUsers] = useState<SkippedUser[]>([]);
  const [showSkippedUsers, setShowSkippedUsers] = useState<boolean>(false);
  const [similarityScore, setSimilarityScore] = useState<number | undefined>(undefined);
  
  const detailsRef = useRef<HTMLDivElement>(null);
  
  const { 
    loading, 
    currentUser,
    noMoreUsers,
    remainingPoints,
    isPremium,
    processingAction,
    loadingDetails,
    loadingSkippedUsers,
    fetchMatchedUsers,
    handleLike, 
    handleSkip,
    fetchDetailedProfile,
    getSkippedUsers,
    restoreSkippedUser
  } = useMatching();

  useEffect(() => {
    if (currentUser && showDetailedView) {
      fetchUserDetails();
    }
  }, [currentUser, showDetailedView]);

  useEffect(() => {
    // スキップしたユーザーのリストを取得（最大20名）
    const loadSkippedUsers = async () => {
      try {
        const skipped = await getSkippedUsers(20);
        setSkippedUsers(skipped);
      } catch (error) {
        console.error('スキップユーザー取得エラー:', error);
      }
    };
    
    if (showSkippedUsers) {
      loadSkippedUsers();
    }
  }, [showSkippedUsers, getSkippedUsers]);

  // 詳細情報を取得する
  const fetchUserDetails = async () => {
    if (!currentUser) return;
    
    try {
      // 詳細プロフィールを取得
      const profileDetails = await fetchDetailedProfile(currentUser.id);
      
      if (profileDetails) {
        // 共通動画を設定
        setCommonVideos(profileDetails.commonVideos);
        
        // 類似度スコアを設定（もしプロフィール詳細に含まれている場合）
        if (profileDetails.profile && profileDetails.profile.matching_score) {
          setSimilarityScore(profileDetails.profile.matching_score);
        }
      }
      
      // 詳細表示時にスクロールを最上部に
      if (detailsRef.current) {
        detailsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('詳細情報取得エラー:', error);
      toast.error('詳細情報の取得に失敗しました');
    }
  };

  // 候補をリロードする
  const refreshCandidates = () => {
    setShowDetailedView(false);
    setCommonVideos([]);
    setSimilarityScore(undefined);
    
    toast.promise(
      fetchMatchedUsers(),
      {
        loading: '候補を更新中...',
        success: '新しいマッチング候補を読み込みました',
        error: '候補の更新に失敗しました'
      }
    );
  };

  // スキップ取り消し
  const handleUndoSkip = async (skippedUser: SkippedUser) => {
    try {
      const success = await restoreSkippedUser(skippedUser.id);
      
      if (success) {
        toast.success('スキップを取り消しました');
        
        // スキップリストから削除
        setSkippedUsers(prev => prev.filter(user => user.id !== skippedUser.id));
        
        // 現在の候補がなければこのユーザーを表示
        if (noMoreUsers) {
          refreshCandidates();
        }
      } else {
        throw new Error('スキップ取り消しに失敗しました');
      }
    } catch (error) {
      console.error('スキップ取り消しエラー:', error);
      toast.error('スキップの取り消しに失敗しました');
    }
  };

  // 詳細表示の切り替え
  const toggleDetailedView = async () => {
    // 詳細表示がOFFの場合はポイント消費
    if (!showDetailedView && !isPremium && remainingPoints < 5) {
      toast.error('ポイントが不足しています');
      return;
    }
    
    const newState = !showDetailedView;
    setShowDetailedView(newState);
    
    // 詳細表示ONでポイント消費（プレミアム会員は無料）
    if (newState && !isPremium && currentUser) {
      // fetchDetailedProfile内でポイント消費が行われるためここでは直接呼び出さない
      fetchUserDetails();
    }
  };

  // 活動レベルの表示テキスト
  const getActivityLevelText = (level: string | number | undefined) => {
    if (level === undefined) return '不明';
    
    // 数値型の場合は文字列に変換
    const levelStr = typeof level === 'number' ? String(level) : level;
    
    switch (levelStr) {
      case 'very_active': return '非常に活発';
      case 'active': return '活発';
      case 'moderate': return '普通';
      case 'casual': return 'カジュアル';
      default: 
        // 数値型の場合は活動度を表示
        if (!isNaN(Number(levelStr))) {
          const num = Number(levelStr);
          if (num >= 8) return '非常に活発';
          if (num >= 6) return '活発';
          if (num >= 4) return '普通';
          if (num >= 1) return 'カジュアル';
        }
        return '不明';
    }
  };

  // 活動レベルの表示色
  const getActivityLevelColor = (level: string | number | undefined) => {
    if (level === undefined) return 'text-gray-500';
    
    // 数値型の場合は文字列に変換
    const levelStr = typeof level === 'number' ? String(level) : level;
    
    switch (levelStr) {
      case 'very_active': return 'text-red-500';
      case 'active': return 'text-orange-500';
      case 'moderate': return 'text-blue-500';
      case 'casual': return 'text-green-500';
      default: 
        // 数値型の場合は活動度に応じた色を表示
        if (!isNaN(Number(levelStr))) {
          const num = Number(levelStr);
          if (num >= 8) return 'text-red-500';
          if (num >= 6) return 'text-orange-500';
          if (num >= 4) return 'text-blue-500';
          if (num >= 1) return 'text-green-500';
        }
        return 'text-gray-500';
    }
  };

  // オンライン状態の表示
  const getOnlineStatusDisplay = (status: string | undefined, lastActive?: string | Date) => {
    if (status === 'online') {
      return <span className="text-green-500">●オンライン</span>;
    }
    
    if (lastActive) {
      // 文字列の場合はDate型に変換
      const lastActiveDate = typeof lastActive === 'string' 
        ? new Date(lastActive)
        : lastActive;
        
      return (
        <span className="text-gray-500">
          最終アクティブ: {formatDistanceToNow(lastActiveDate, { addSuffix: true, locale: ja })}
        </span>
      );
    }
    
    return <span className="text-gray-500">オフライン</span>;
  };

  // 日付をフォーマットする
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true, locale: ja });
  };

  // 視聴傾向の表示
  const renderViewingTrends = () => {
    if (!currentUser?.viewing_trends || Object.keys(currentUser.viewing_trends).length === 0) {
      return (
        <p className="text-gray-500 text-center py-4">視聴傾向データはありません</p>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(currentUser.viewing_trends).map(([genre, percentage], index) => (
          <div key={index} className="flex items-center">
            <span className="w-24 truncate text-sm">{genre}</span>
            <div className="ml-2 flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 rounded-full" 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <span className="ml-2 text-xs">{percentage}%</span>
          </div>
        ))}
      </div>
    );
  };

  // 共通の友達表示
  const renderCommonFriends = () => {
    if (!currentUser?.common_friends || currentUser.common_friends.length === 0) {
      return (
        <p className="text-gray-500 text-center py-4">共通の友達はいません</p>
      );
    }

    return (
      <div>
        <div className="flex -space-x-2 overflow-hidden mb-3">
          {currentUser.common_friends.slice(0, 7).map((friend, index) => (
            <img
              key={index}
              className="inline-block h-10 w-10 rounded-full ring-2 ring-white"
              src={friend.avatar_url || '/default-avatar.jpg'}
              alt={friend.username || '友達'}
            />
          ))}
          {currentUser.common_friends.length > 7 && (
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 text-xs text-gray-700">
              +{currentUser.common_friends.length - 7}
            </div>
          )}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{currentUser.common_friends.length}人</span>の共通の友達がいます
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-4" ref={detailsRef}>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">マッチング</h1>
        <div className="flex items-center space-x-4">
          {!isPremium && (
            <span className="text-sm flex items-center">
              <FontAwesomeIcon icon={faCoins} className="mr-1 text-yellow-500" />
              残りポイント: <strong className="ml-1">{remainingPoints}</strong>
            </span>
          )}
          <button
            onClick={() => setShowSkippedUsers(!showSkippedUsers)}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center"
            disabled={processingAction}
          >
            <FontAwesomeIcon icon={faHistory} className="mr-2" />
            スキップ履歴
          </button>
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center"
            disabled={processingAction}
          >
            <FontAwesomeIcon icon={faCog} className="mr-2" />
            設定
          </button>
        </div>
      </div>

      {showPreferences ? (
        <MatchPreferences onClose={() => setShowPreferences(false)} />
      ) : showSkippedUsers ? (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center">
              <FontAwesomeIcon icon={faHistory} className="mr-2 text-gray-500" />
              最近スキップしたユーザー
            </h2>
            <button
              onClick={() => setShowSkippedUsers(false)}
              className="text-gray-500 hover:text-gray-700 flex items-center"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
              戻る
            </button>
          </div>
          
          {loadingSkippedUsers ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : skippedUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-6">スキップしたユーザーはいません</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skippedUsers.map(user => (
                <div key={user.id} className="border rounded-lg p-4 flex flex-col">
                  <div className="flex items-center mb-3">
                    <img 
                      src={user.avatar_url || '/default-avatar.jpg'} 
                      alt={user.username || '名前なし'} 
                      className="w-12 h-12 rounded-full object-cover mr-3"
                    />
                    <div>
                      <h3 className="font-semibold flex items-center">
                        {user.username || '名前なし'}
                        {user.is_premium && (
                          <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                            Premium
                          </span>
                        )}
                      </h3>
                      <div className="text-sm text-gray-500 flex items-center">
                        <FontAwesomeIcon 
                          icon={faFire} 
                          className={`mr-1 ${getActivityLevelColor(user.activity_level)}`} 
                        />
                        {getActivityLevelText(user.activity_level)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm mb-2">
                    <div className="flex items-center text-gray-600 mb-1">
                      <FontAwesomeIcon icon={faUsers} className="mr-2 text-blue-400" />
                      共通の興味: {user.common_interests?.length || 0}個
                    </div>
                    <div className="flex items-center text-gray-600 mb-1">
                      <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-green-400" />
                      スキップ日: {formatDate(user.skipped_at)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleUndoSkip(user)}
                    className="mt-auto px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                    disabled={processingAction}
                  >
                    スキップを取り消す
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {currentUser ? (
            <div className="w-full max-w-4xl">
              <UserCard 
                user={currentUser} 
                onLike={handleLike}
                onSkip={handleSkip}
                isPremium={isPremium}
                hasDetailedView={true}
                onViewProfile={toggleDetailedView}
                commonVideos={commonVideos}
                similarityScore={similarityScore}
                showYouTubeLink={currentUser.channel_url ? true : false}
              />
              
              {showDetailedView && (
                <div className="bg-white rounded-xl shadow-md p-6 mt-4 animate-fadeIn">
                  {loadingDetails ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold mb-4 flex items-center">
                        <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-blue-500" />
                        詳細プロフィール
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h3 className="font-semibold text-gray-700 mb-2">プロフィール</h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="mb-2">
                              <span className="text-gray-500 text-sm">ステータス:</span>
                              <div className="text-sm mt-1">
                                {getOnlineStatusDisplay(currentUser.online_status, currentUser.last_active)}
                              </div>
                            </div>
                            
                            <div className="mb-2">
                              <span className="text-gray-500 text-sm">活動レベル:</span>
                              <div className={`font-medium mt-1 ${getActivityLevelColor(currentUser.activity_level)}`}>
                                {getActivityLevelText(currentUser.activity_level)}
                              </div>
                            </div>
                            
                            {currentUser.bio && (
                              <div className="mb-2">
                                <span className="text-gray-500 text-sm">自己紹介:</span>
                                <p className="mt-1">{currentUser.bio}</p>
                              </div>
                            )}
                            
                            {currentUser.channel_url && (
                              <div className="mt-3">
                                <a 
                                  href={currentUser.channel_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-red-600 hover:text-red-700 text-sm flex items-center"
                                >
                                  <FontAwesomeIcon icon={faFilm} className="mr-1" />
                                  YouTubeチャンネルを見る
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-gray-700 mb-2">共通の興味</h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            {currentUser.common_interests && currentUser.common_interests.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {currentUser.common_interests.map((interest, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    {interest}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">共通の興味が見つかりませんでした</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* 新しい視聴傾向セクション */}
                      {currentUser.viewing_trends && Object.keys(currentUser.viewing_trends).length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                            <FontAwesomeIcon icon={faChartBar} className="mr-2 text-teal-500" />
                            視聴傾向
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            {renderViewingTrends()}
                          </div>
                        </div>
                      )}
                      
                      {/* 共通の友達セクション */}
                      {currentUser.common_friends && currentUser.common_friends.length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                            <FontAwesomeIcon icon={faUserFriends} className="mr-2 text-indigo-500" />
                            共通の友達
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            {renderCommonFriends()}
                          </div>
                        </div>
                      )}
                      
                      {/* ユーザータイプ・適合度セクション */}
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                          <FontAwesomeIcon icon={faBrain} className="mr-2 text-purple-500" />
                          適合度分析
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center mb-3">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                              {Math.round(currentUser.matching_score || similarityScore || 0)}%
                            </div>
                            <div className="ml-4">
                              <h4 className="font-medium">マッチングスコア</h4>
                              <p className="text-sm text-gray-600">
                                視聴傾向と興味に基づく適合度
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-700">
                            <div className="flex items-center mb-2">
                              <FontAwesomeIcon icon={faUsers} className="text-blue-500 mr-2" />
                              <span>共通の興味: {currentUser.common_interests?.length || 0}個</span>
                            </div>
                            <div className="flex items-center mb-2">
                              <FontAwesomeIcon icon={faLayerGroup} className="text-green-500 mr-2" />
                              <span>共通のジャンル: {currentUser.common_genres?.length || 0}個</span>
                            </div>
                            <div className="flex items-center">
                              <FontAwesomeIcon icon={faFilm} className="text-red-500 mr-2" />
                              <span>共通の視聴動画: {commonVideos.length || currentUser.common_videos_count || 0}本</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                          <FontAwesomeIcon icon={faFilm} className="mr-2 text-red-500" />
                          共通の視聴動画 ({commonVideos.length})
                        </h3>
                        
                        {commonVideos.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {commonVideos.map((video) => (
                              <div key={video.id} className="border rounded-lg overflow-hidden">
                                <a 
                                  href={`https://www.youtube.com/watch?v=${video.youtube_id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <img 
                                    src={video.thumbnail_url} 
                                    alt={video.title} 
                                    className="w-full h-32 object-cover"
                                  />
                                </a>
                                <div className="p-2">
                                  <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                                  <p className="text-xs text-gray-500 mt-1">{video.channel_name}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">共通の視聴動画はありません</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : noMoreUsers ? (
            <div className="text-center py-10 bg-white p-8 rounded-xl shadow-md max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">現在マッチング候補がありません</h2>
              <p className="text-gray-600 mb-6">
                すべての候補を確認しました。新しい候補が追加されるまでお待ちいただくか、
                設定を変更して候補の範囲を広げることができます。
              </p>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={refreshCandidates}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center"
                  disabled={processingAction}
                >
                  <FontAwesomeIcon icon={faRedo} className="mr-2" />
                  候補を更新する
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
                  disabled={processingAction}
                >
                  マッチング設定を変更
                </button>
                <button
                  onClick={() => setShowSkippedUsers(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center"
                  disabled={processingAction}
                >
                  <FontAwesomeIcon icon={faHistory} className="mr-2" />
                  スキップしたユーザーを確認
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-white p-8 rounded-xl shadow-md max-w-md w-full">
              <p className="text-lg mb-4">マッチング候補が見つかりませんでした</p>
              <p className="text-gray-500 mb-6">
                設定を変更するか、後でもう一度お試しください
              </p>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={refreshCandidates}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center"
                  disabled={processingAction}
                >
                  <FontAwesomeIcon icon={faRedo} className="mr-2" />
                  候補を更新する
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
                  disabled={processingAction}
                >
                  マッチング設定を変更
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchingDashboard;