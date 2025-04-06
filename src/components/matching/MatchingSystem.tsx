// src/components/matching/MatchingSystem.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMatching } from '../../hooks/useMatching';
import { supabase } from '../../lib/supabase';
import { Crown, Lock, Users, AlertCircle, RefreshCw } from 'lucide-react';
import UserCard from './UserCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import { ConnectionStatus, MatchingUser } from '../../types/matching';
import { toast } from 'react-hot-toast';
import { connectUsers } from '../../services/matchingService';
interface MatchingSystemProps {
  limit?: number;
}

export default function MatchingSystem({ limit }: MatchingSystemProps) {
  const { user, isPremium } = useAuth();
  const {
    loading, 
    matchedUsers,
    fetchMatchedUsers,
    debugInfo,
    initializeDefaultPreferences,
    likeUser,
    skipUser
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

  // マッチングデータを取得する関数
  const loadMatches = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log('既にロード中のため、取得をスキップします');
      return;
    }
    
    try {
      console.log('マッチング取得開始');
      setIsFetching(true);
      isFetchingRef.current = true;
      
      // マッチング設定がない場合に初期化する
      await initializeDefaultPreferences();
      
      await fetchMatchedUsers();
      setError(null);
      console.log('マッチング取得完了');
    } catch (err) {
      console.error('マッチングユーザーの取得エラー:', err);
      setError('マッチングユーザーの取得に失敗しました');
    } finally {
      setIsFetching(false);
      isFetchingRef.current = false;
    }
  }, [fetchMatchedUsers, initializeDefaultPreferences]);

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

  // いいね処理のハンドラー
  const handleLike = async (userId: string): Promise<boolean> => {
    return await likeUser(userId);
  };

  // スキップ処理のハンドラー
  const handleSkip = async (userId: string): Promise<boolean> => {
    return await skipUser(userId);
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
        <h2 className="text-xl font-bold text-gray-900">おすすめのユーザー</h2>
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

      {/* リフレッシュボタン */}
      <div className="mb-4">
        <button
          onClick={loadMatches}
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

      {/* デバッグ情報表示エリア（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="mt-2 mb-4 text-xs font-mono p-2 bg-gray-800 text-white rounded-md overflow-auto max-h-40">
          <div>候補件数: {debugInfo.enhancedCandidatesCount || debugInfo.candidatesCount || 0}件</div>
          <div>取得時間: {debugInfo.fetchTime || '-'}</div>
          <div>ポイント残高: {debugInfo.remainingPoints || 0}</div>
          <div>プレミアム: {debugInfo.isPremium ? 'あり' : 'なし'}</div>
          <div>視聴履歴: {debugInfo.userHistoryCount || 0}件</div>
          <div>スキップユーザー: {debugInfo.skippedUsersCount || 0}件</div>
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
          <button
            onClick={loadMatches}
            className="mx-auto block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            再試行
          </button>
        </div>
      ) : displayedMatches.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          マッチするユーザーが見つかりませんでした
          <div className="mt-4">
            <button
              onClick={loadMatches}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'ロード中...' : 'マッチング候補を再取得'}
            </button>
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