// src/components/matching/MatchingSystem.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMatching } from '@/hooks/useMatching';
import { supabase } from '@/lib/supabase';
import { Crown, Lock, Users, AlertCircle, RefreshCw, Zap, Filter } from 'lucide-react';
import UserCard from '@/components/matching/UserCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import { ConnectionStatus, MatchingUser } from '@/types/matching';
import { toast } from 'react-hot-toast';
import { connectUsers } from '@/services/matchingService';
import { notificationService } from '@/services/notificationService';

interface MatchingSystemProps {
  limit?: number;
  matchedOnly?: boolean; // マッチング済みユーザーのみを表示するかどうか
}

export default function MatchingSystem({ limit, matchedOnly = false }: MatchingSystemProps) {
  const { user, isPremium } = useAuth();
  const {
    loading, 
    matchedUsers,
    fetchMatchedUsers,
    debugInfo,
    initializeDefaultPreferences,
    likeUser,
    skipUser,
    pointBalance,
    isRelaxedMode,
    toggleRelaxedMode,
    error: matchingError
  } = useMatching();
  
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  // ローカルでの接続状態を追跡するstate
  const [localConnectionStates, setLocalConnectionStates] = useState<{[key: string]: ConnectionStatus}>({});
  // リアルタイム接続状態変更イベントの検出フラグ
  const [connectionChanged, setConnectionChanged] = useState(false);
  // 更新されたマッチングユーザーリスト
  const [updatedMatchedUsers, setUpdatedMatchedUsers] = useState<MatchingUser[]>([]);
  // 緩和モード試行中かどうかのフラグ
  const [attemptedRelaxedMode, setAttemptedRelaxedMode] = useState(false);
  
  // useRefを使用して初期ロードが完了したかを追跡
  const initialLoadDone = useRef(false);
  // 接続監視チャンネルを保持するためのref
  const connectionChannelRef = useRef<any>(null);
  // 前回のmatchedUsersの値を保持するref
  const prevMatchedUsersRef = useRef<MatchingUser[]>([]);
  // フェッチング状態を追跡するためのref
  const isFetchingRef = useRef(false);

  // matchedUsersが変更されたら更新 - 深い比較と参照比較を行い、実際に変更があった場合のみ更新
  useEffect(() => {
    // matchedUsersが空でなく、かつ変更があった場合にのみ更新
    if (matchedUsers.length > 0) {
      // 前回の値との比較
      const hasChanged = matchedUsers.length !== prevMatchedUsersRef.current.length || 
                         JSON.stringify(matchedUsers) !== JSON.stringify(prevMatchedUsersRef.current);
      
      if (hasChanged) {
        console.log('マッチングユーザーリストが更新されました', matchedUsers.length);
        setUpdatedMatchedUsers(matchedUsers);
        // 前回の値を更新
        prevMatchedUsersRef.current = [...matchedUsers];
      }
    }
  }, [matchedUsers]);

  // エラーを表示するuseEffect
  useEffect(() => {
    if (matchingError) {
      setError(matchingError);
    }
  }, [matchingError]);

  // マッチングデータを取得する関数
  const loadMatches = useCallback(async (useRelaxedMode: boolean = false) => {
    if (isFetchingRef.current) {
      console.log('既にロード中のため、取得をスキップします');
      return;
    }
    
    try {
      console.log('マッチング取得開始', useRelaxedMode ? '(緩和モード)' : '');
      setIsFetching(true);
      isFetchingRef.current = true;
      
      // マッチング設定がない場合に初期化する
      await initializeDefaultPreferences();

      // 緩和モードを適用するかどうか
      if (useRelaxedMode && !isRelaxedMode) {
        toggleRelaxedMode(true);
        setAttemptedRelaxedMode(true);
      } else if (!useRelaxedMode && isRelaxedMode) {
        toggleRelaxedMode(false);
        setAttemptedRelaxedMode(false);
      }
      
      // コンポーネントのプロパティに応じて、マッチング済みユーザーまたはマッチング候補を取得
      await fetchMatchedUsers(matchedOnly); // matchedOnlyの値に基づいて取得モードを切り替え
      
      setError(null);
      console.log('マッチング取得完了');
    } catch (err) {
      console.error('マッチングユーザーの取得エラー:', err);
      setError('マッチングユーザーの取得に失敗しました');
    } finally {
      setIsFetching(false);
      isFetchingRef.current = false;
    }
  }, [fetchMatchedUsers, initializeDefaultPreferences, matchedOnly, isRelaxedMode, toggleRelaxedMode]);

  // マッチング候補が見つからない場合に緩和モードで再試行する
  const retryWithRelaxedMode = useCallback(() => {
    if (!isRelaxedMode) {
      // 緩和モードを有効にして再取得
      loadMatches(true);
    } else {
      // 既に緩和モードの場合は通常モードに戻す
      toggleRelaxedMode(false);
      setAttemptedRelaxedMode(false);
      loadMatches(false);
    }
  }, [isRelaxedMode, loadMatches, toggleRelaxedMode]);

  // 初期ロード
  useEffect(() => {
    // ユーザーがいない場合は何もしない
    if (!user) return;
    
    // 初期ロード時に実行
    const loadData = async () => {
      // 既にロード中の場合はスキップ
      if (isFetchingRef.current) {
        console.log('既にロード中のため、初期ロードをスキップします');
        return;
      }
      
      try {
        await loadMatches();
        
        // 初期ロード完了フラグを立てる（初回のみ）
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
        }
      } catch (error) {
        console.error('データ読み込みエラー:', error);
        setError('データの読み込みに失敗しました');
        
        // エラー時は状態をリセット
        setIsFetching(false);
        isFetchingRef.current = false;
      }
    };
    
    // 初期ロード時に実行
    if (!initialLoadDone.current) {
      loadData();
    }
  }, [user, loadMatches]);

  // 接続状態変更のリアルタイム監視
  useEffect(() => {
    // すでに接続されているチャンネルがある場合はスキップ
    if (!user || connectionChannelRef.current) {
      return () => {
        // クリーンアップのみ提供
      };
    }

    console.log('UI更新用接続監視を開始');
    
    // 接続状態変更のサブスクリプション
    const connectionsChannel = supabase.channel('matching-ui-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connections',
        filter: `or(user_id.eq.${user.id},connected_user_id.eq.${user.id})`
      }, (payload) => {
        console.log('接続状態変更をUIで検知:', payload);
        
        // 変更フラグを立てる
        setConnectionChanged(true);
        
        // 新しい接続データ
        const newData = payload.new as any;
        
        // 接続状態が変更された場合、ローカル状態を更新
        if (newData && (newData.user_id === user.id || newData.connected_user_id === user.id)) {
          // 対象ユーザーIDを特定
          const targetUserId = newData.user_id === user.id ? newData.connected_user_id : newData.user_id;
          
          // ローカル状態を更新
          setLocalConnectionStates(prev => ({
            ...prev,
            [targetUserId]: newData.status as ConnectionStatus
          }));
          
          // マッチングユーザーリストのUI状態も更新
          setUpdatedMatchedUsers(prevUsers => {
            // ユーザーリストに変更がある場合のみ更新を行う
            const updatedUsers = prevUsers.map(u => {
              if (u.id === targetUserId) {
                return { ...u, connection_status: newData.status as ConnectionStatus };
              }
              return u;
            });
            
            // 変更がない場合は同じ参照を返して不要な再レンダリングを防止
            return JSON.stringify(updatedUsers) !== JSON.stringify(prevUsers) 
              ? updatedUsers 
              : prevUsers;
          });
        }
      })
      .subscribe();
    
    // 接続を保存
    connectionChannelRef.current = connectionsChannel;
    
    // クリーンアップ関数
    return () => {
      console.log('UI更新用接続監視を終了');
      if (connectionChannelRef.current) {
        supabase.removeChannel(connectionChannelRef.current)
          .then(status => {
            console.log("Channel removed with status:", status);
            connectionChannelRef.current = null;
          })
          .catch(err => console.error("Failed to remove channel:", err));
      }
    };
  }, [user]);

  // 接続状態変更時にデータを再取得（連続更新を防ぐためにディレイを入れる）
  useEffect(() => {
    if (!connectionChanged) return;
    
    const timer = setTimeout(() => {
      // 接続状態の変更後、データを再取得
      console.log('接続状態が変更されたため、データを再取得します');
      loadMatches();
      
      // フラグをリセット
      setConnectionChanged(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [connectionChanged, loadMatches]);
  
  // 接続リクエスト送信のハンドラー
  const handleConnect = async (userId: string): Promise<boolean> => {
    if (!isPremium || !user) {
      toast.error('この機能はプレミアム会員限定です');
      return false;
    }
    
    try {
      // matchingService.tsの関数を使用
      const result = await connectUsers(user.id, userId);
      
      if (result.success) {
        if (result.status === ConnectionStatus.PENDING) {
          toast.success('接続リクエストを送信しました');
        } else if (result.status === ConnectionStatus.CONNECTED) {
          toast.success('既につながっています');
        } else if (result.status === ConnectionStatus.REJECTED) {
          toast.error('このユーザーとは接続できません');
        }
        
        // ローカル状態を即時更新してUIに反映
        setLocalConnectionStates(prev => ({
          ...prev,
          [userId]: result.status
        }));
        
        return true;
      } else {
        throw new Error(result.error || '接続リクエストの送信に失敗しました');
      }
    } catch (err) {
      console.error('接続リクエストエラー:', err);
      
      // 重複エラーの場合は特別なメッセージを表示
      if (err && typeof err === 'object' && 'code' in err && (err as any).code === '23505') {
        toast.error('既に接続リクエストを送信済みです');
        // 重複エラーの場合もPENDINGとして扱う
        setLocalConnectionStates(prev => ({
          ...prev,
          [userId]: ConnectionStatus.PENDING
        }));
        return true; // エラーではあるが、既に送信済みなのでUIとしては成功扱い
      } else {
        setError('接続リクエストの送信に失敗しました');
        toast.error('接続リクエストの送信に失敗しました');
        return false;
      }
    }
  };

  // 接続リクエストの応答処理（承認/拒否）
  const handleConnectionResponse = async (
    connectionId: string,
    status: ConnectionStatus.CONNECTED | ConnectionStatus.REJECTED
  ): Promise<boolean> => {
    if (!user) {
      toast.error('ログインが必要です');
      return false;
    }
    
    try {
      // notificationService.tsの関数を使用して接続リクエストに応答
      const result = await notificationService.respondToConnectionRequest(
        connectionId,
        status
      );
      
      if (result.success) {
        if (status === ConnectionStatus.CONNECTED) {
          toast.success('接続リクエストを承認しました');
        } else {
          toast.success('接続リクエストを拒否しました');
        }
        
        // データを再取得してUIを更新
        loadMatches();
        
        return true;
      } else {
        throw new Error(result.error || '接続リクエストの応答に失敗しました');
      }
    } catch (err) {
      console.error('接続リクエスト応答エラー:', err);
      toast.error('処理に失敗しました');
      return false;
    }
  };

  // いいね処理のハンドラー
  const handleLike = async (userId: string): Promise<boolean> => {
    try {
      const success = await likeUser(userId);
      if (success) {
        toast.success('いいねを送信しました');
        // いいねが成功したら、一時的にマッチングリストから削除して UI を更新
        setUpdatedMatchedUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        toast.error('いいねの送信に失敗しました');
      }
      return success;
    } catch (err) {
      console.error('いいね処理エラー:', err);
      toast.error('いいねの送信に失敗しました');
      return false;
    }
  };

  // スキップ処理のハンドラー
  const handleSkip = async (userId: string): Promise<boolean> => {
    try {
      const success = await skipUser(userId);
      if (success) {
        toast.success('スキップしました');
        // スキップが成功したら、一時的にマッチングリストから削除して UI を更新
        setUpdatedMatchedUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        toast.error('スキップに失敗しました');
      }
      return success;
    } catch (err) {
      console.error('スキップ処理エラー:', err);
      toast.error('スキップに失敗しました');
      return false;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">マッチング機能を利用するにはログインが必要です。</p>
        <Link 
          to="/login" 
          className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          ログインする
        </Link>
      </div>
    );
  }

  // 表示件数を計算
  const calculateLimit = (customLimit?: number) => {
    if (customLimit) return customLimit;
    return isPremium ? 10 : 3;
  };
  
  const displayLimit = calculateLimit(limit);
  const displayedMatches = limit 
    ? updatedMatchedUsers.slice(0, limit) 
    : (showMore ? updatedMatchedUsers : updatedMatchedUsers.slice(0, displayLimit));

  // ローディング状態の統合 - 明確な単一の状態に
  const isLoading = isFetching || loading;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            {matchedOnly ? "マッチング済みユーザー" : "マッチング候補"}
            {isRelaxedMode && !matchedOnly && (
              <span className="ml-2 text-sm font-normal text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md flex items-center">
                <Zap className="w-3 h-3 mr-1" />
                緩和モード
              </span>
            )}
          </h2>
          {!matchedOnly && (
            <p className="text-sm text-gray-500 mt-1">
              趣味や視聴傾向が似ているユーザーを表示しています
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          {isPremium ? (
            <span className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
              <Crown className="w-4 h-4 mr-1.5 text-yellow-600" />
              プレミアム機能
            </span>
          ) : (
            <Link 
              to="/premium" 
              className="flex items-center text-sm text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <Lock className="w-4 h-4 mr-1" />
              プレミアムへアップグレード
            </Link>
          )}
        </div>
      </div>

      {/* 検索条件と緩和モード切り替え */}
      {!matchedOnly && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={retryWithRelaxedMode}
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md 
                       ${isRelaxedMode 
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} 
                       transition-colors`}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            {isRelaxedMode ? "通常条件に戻す" : "条件を緩和する"}
          </button>
          
          <button
            onClick={() => loadMatches(isRelaxedMode)}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-1.5" />
                ロード中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                マッチング候補を更新
              </>
            )}
          </button>
        </div>
      )}

      {/* デバッグ情報表示エリア（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="mt-2 mb-4 text-xs font-mono p-2 bg-gray-800 text-white rounded-md overflow-auto max-h-40">
          <div>マッチング済み件数: {debugInfo.enhancedCandidatesCount || debugInfo.candidatesCount || 0}件</div>
          <div>取得時間: {debugInfo.fetchTime || '-'}</div>
          <div>ポイント残高: {pointBalance || 0}</div>
          <div>プレミアム: {debugInfo.isPremium ? 'あり' : 'なし'}</div>
          <div>視聴履歴: {debugInfo.userHistoryCount || 0}件</div>
          <div>スキップユーザー: {debugInfo.skippedUsersCount || 0}件</div>
          <div>緩和モード: {isRelaxedMode ? 'ON' : 'OFF'}</div>
          <div>緩和モード試行: {attemptedRelaxedMode ? 'あり' : 'なし'}</div>
          {debugInfo.realtimeUpdate && (
            <div className="text-green-400">
              リアルタイム更新: {debugInfo.realtimeUpdate.time} ({debugInfo.realtimeUpdate.type})
            </div>
          )}
          {debugInfo.matchingError && (
            <div className="text-red-400">エラー: {String(debugInfo.matchingError)}</div>
          )}
        </div>
      )}

      {/* ローディング中 */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="py-8">
          <div className="flex items-center justify-center text-red-600 mb-2">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 mt-4">
            <button
              onClick={() => loadMatches(isRelaxedMode)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              再試行
            </button>
            
            {!matchedOnly && (
              <button
                onClick={retryWithRelaxedMode}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
              >
                {isRelaxedMode ? "通常モードで試す" : "条件を緩和して試す"}
              </button>
            )}
          </div>
        </div>
      ) : displayedMatches.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          {matchedOnly ? (
            <>
              <div className="text-lg font-medium mb-2">マッチング済みユーザーが見つかりませんでした</div>
              <p className="text-sm mb-4">まだ他のユーザーと相互にいいねを交換していないようです。マッチング候補からいいねを送ってみましょう。</p>
            </>
          ) : (
            <>
              <div className="text-lg font-medium mb-2">
                {isRelaxedMode ? (
                  "マッチング候補が見つかりませんでした"
                ) : (
                  "条件に合うマッチング候補が見つかりませんでした"
                )}
              </div>
              <div className="text-sm mb-4">
                {isRelaxedMode ? (
                  <>
                    すべての条件を緩和しても候補が見つかりませんでした。<br />
                    • 新しいユーザーが登録されるのを待つ<br />
                    • しばらく時間をおいて再試行する<br />
                    • 自分のプロフィールを充実させてみる
                  </>
                ) : (
                  <>
                    候補が見つからない理由として次のことが考えられます：<br />
                    • 既にほとんどのユーザーにいいねを送信済み<br />
                    • 条件に合うユーザーが少ない<br />
                    • 検索条件が厳しすぎる（「条件を緩和」を試してみてください）
                  </>
                )}
              </div>
            </>
          )}
          <div className="mt-4 flex flex-col items-center justify-center gap-2">
            <button
              onClick={() => loadMatches(isRelaxedMode)}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'ロード中...' : matchedOnly ? 'マッチング済みユーザーを再取得' : 'マッチング候補を再取得'}
            </button>
            
            {!matchedOnly && !isRelaxedMode && (
              <button
                onClick={retryWithRelaxedMode}
                disabled={isLoading}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                <Zap className="w-4 h-4 inline-block mr-1" />
                条件を緩和して試す
              </button>
            )}
            
            {!matchedOnly && isRelaxedMode && (
              <button
                onClick={retryWithRelaxedMode}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                通常モードに戻す
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedMatches.map((match) => {
            // データベースの状態とローカル状態を組み合わせて最終的な接続状態を決定
            const effectiveConnectionStatus = localConnectionStates[match.id] || match.connection_status;
            
            // 接続状態を反映した更新済みマッチングユーザーを作成
            const updatedMatch: MatchingUser = {
              ...match,
              connection_status: effectiveConnectionStatus
            };
            
            return (
              <div key={match.id} className="w-full flex justify-center">
                <UserCard
                  user={updatedMatch}
                  onLike={handleLike}
                  onSkip={handleSkip}
                  onConnect={handleConnect}
                  onAcceptConnection={
                    match.connection_id && effectiveConnectionStatus === ConnectionStatus.PENDING
                      ? (match.is_initiator ? undefined : () => handleConnectionResponse(match.connection_id!, ConnectionStatus.CONNECTED))
                      : undefined
                  }
                  onRejectConnection={
                    match.connection_id && effectiveConnectionStatus === ConnectionStatus.PENDING
                      ? (match.is_initiator ? undefined : () => handleConnectionResponse(match.connection_id!, ConnectionStatus.REJECTED))
                      : undefined
                  }
                  isPremium={isPremium}
                  hasDetailedView={false}
                  showYouTubeLink={true}
                />
              </div>
            );
          })}
          
         {/* プレミアム会員でない場合はもっと見るボタンを表示 */}
         {!isPremium && updatedMatchedUsers.length > displayLimit && !limit && (
            <div className="pt-4">
              <Link
                to="/premium"
                className="block w-full py-3 px-4 text-center bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 text-yellow-700 font-medium rounded-lg transition-colors"
              >
                <Crown className="inline-block w-5 h-5 mr-2 text-yellow-500" />
                プレミアム会員になって{updatedMatchedUsers.length - displayLimit}人以上のマッチングを見る
              </Link>
            </div>
          )}
          
          {/* プレミアム会員で表示制限がある場合のもっと見るボタン */}
          {isPremium && !showMore && updatedMatchedUsers.length > displayLimit && !limit && (
            <button
              onClick={() => setShowMore(true)}
              className="block w-full py-3 px-4 text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg transition-colors"
            >
              すべて表示（{updatedMatchedUsers.length}人）
            </button>
          )}
          
          {/* プレミアム会員の詳細ページへのリンク */}
          {isPremium && limit && updatedMatchedUsers.length > limit && (
            <div className="pt-4 text-center">
              <Link
                to="/premium/matching"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors"
              >
                すべてのマッチングを見る
                <Users className="ml-2 w-4 h-4" />
                </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}