// src/pages/MatchingPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { usePoints } from '@/hooks/usePoints';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faInfoCircle, 
} from '@fortawesome/free-solid-svg-icons';
import VerificationGuard from '@/components/matching/VerificationGuard';
import { VerificationLevel } from '@/services/verificationService';
import MatchingSystem from '@/components/matching/MatchingSystem';

const MatchingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [verificationLevel, setVerificationLevel] = useState<number>(2); // デフォルト値を2に設定
  const { 
    balance: pointBalance, 
    loading: pointsLoading, 
    isPremium
  } = usePoints();

  useEffect(() => {
    // ユーザーが認証されていない場合はログインページへリダイレクト
    if (!user) {
      navigate('/login', { state: { from: '/matching' } });
      return;
    }

    // ユーザー認証レベルを確認
    checkUserStatus();
  }, [user, navigate]);

  const checkUserStatus = async () => {
    setLoading(true);
    try {
      try {
        // まずテーブルが存在するか確認
        const { error: tableCheckError } = await supabase
          .from('user_verification')
          .select('count')
          .limit(1);

        // テーブルが存在しない場合は早期リターン
        if (tableCheckError && tableCheckError.code === '42P01') {
          console.log('user_verification テーブルが存在しません。デフォルト値を使用します。');
          setVerificationLevel(2); // デフォルト値として2を設定
          setLoading(false);
          return;
        }

        // テーブルが存在する場合は通常通り処理
        const { data, error } = await supabase
          .from('user_verification')
          .select('verification_level')
          .eq('user_id', user?.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116はレコードが見つからない場合のエラーコード
          throw error;
        }

        setVerificationLevel(data?.verification_level || 2);
      } catch (error: any) {
        // テーブルが存在しない場合は静かに失敗
        if (error.code === '42P01') {
          console.log('user_verification テーブルが存在しません。デフォルト値を使用します。');
          setVerificationLevel(2);
        } else {
          console.error('ユーザーステータスの取得に失敗しました:', error);
          // 不要なトースト通知を削除
          // toast.error('ユーザー情報の読み込みに失敗しました');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // プレミアム機能の案内
  const renderPremiumBanner = () => {
    if (!isPremium) {
      return (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-lg mb-6 shadow-md">
          <h3 className="font-bold text-lg mb-2">プレミアム会員になって特典を受けよう！</h3>
          <ul className="list-disc list-inside mb-3 text-sm">
            <li>ポイント消費50%オフ</li>
            <li>毎月100ポイントプレゼント</li>
            <li>メッセージ既読通知機能</li>
            <li>高度なマッチングフィルター無料</li>
          </ul>
          <button
            onClick={() => navigate('/premium')}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            詳細を見る
          </button>
        </div>
      );
    }
    
    return null;
  };

  // 認証レベルに基づいて表示内容を変更
  const renderVerificationBanner = () => {
    // 認証レベルが1（基本）の場合は警告表示
    if (verificationLevel === 1) {
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex items-start">
            <div className="ml-3">
              <h3 className="text-yellow-700 font-semibold">アカウント認証が必要です</h3>
              <p className="text-sm text-yellow-600 mt-1">
                マッチング機能をフルに利用するには、電話番号による本人確認が必要です。
                認証を完了すると、メッセージの送受信が可能になります。
              </p>
              <button
                onClick={() => navigate('/profile/verification')}
                className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                認証手続きへ進む
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // ポイント残高表示
  const renderPointBalance = () => {
    if (pointsLoading) return <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>;
    
    return (
      <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-700">ポイント残高</h3>
            <p className="text-2xl font-bold text-indigo-600">{pointBalance || 0} pt</p>
          </div>
          <button
            onClick={() => navigate('/points')}
            className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 transition-colors text-sm"
          >
            チャージ
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          <p>プロフィール閲覧: 5ポイント | メッセージ送信: 1ポイント{isPremium ? ' (50%オフ)' : ''}</p>
        </div>
      </div>
    );
  };

  if (loading || pointsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
        <p className="ml-2 text-gray-600">マッチング情報を読み込み中...</p>
      </div>
    );
  }

  return (
    <VerificationGuard 
      requiredLevel={VerificationLevel.PHONE_VERIFIED}
      fallbackMessage="マッチング機能を利用するには電話番号認証が必要です。認証を完了すると20ポイントのボーナスも獲得できます。"
    >
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">マッチング</h1>
          <p className="text-gray-600 mt-1">あなたと趣味や視聴傾向が似ているユーザーを見つけましょう</p>
        </div>
        
        <Toaster position="top-center" />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {renderPointBalance()}
            {renderVerificationBanner()}
            {renderPremiumBanner()}
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-blue-500" />
                マッチングについて
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                マッチングは、あなたの視聴履歴や興味に基づいて、似た趣味を持つユーザーを見つける機能です。
                いいねを送ってつながりましょう！
              </p>
              <div className="text-xs text-gray-500">
                <p>※ マッチング候補はあなたの視聴履歴やプロフィール情報に基づいて自動的に表示されます</p>
                <p>※ プロフィールを充実させると、より精度の高いマッチングが可能になります</p>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              {/* ここにMatchingSystemコンポーネントを配置 */}
              <MatchingSystem matchedOnly={false} />
            </div>
          </div>
        </div>
      </div>
    </VerificationGuard>
  );
};

export default MatchingPage;