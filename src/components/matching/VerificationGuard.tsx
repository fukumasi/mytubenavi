// src/components/matching/VerificationGuard.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { verificationService, VerificationLevel } from '@/services/verificationService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { getUserGender } from '@/services/matchingService';
import { supabase } from '@/lib/supabase';

interface VerificationGuardProps {
  requiredLevel: VerificationLevel;
  children: React.ReactNode;
  fallbackMessage?: string; // 汎用的なフォールバックメッセージ
  femaleMessage?: string;
  maleMessage?: string;
}

const VerificationGuard: React.FC<VerificationGuardProps> = ({
  requiredLevel,
  children,
  fallbackMessage,
  femaleMessage,
  maleMessage,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [hasRequiredLevel, setHasRequiredLevel] = useState<boolean>(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  
  useEffect(() => {
    const checkVerificationLevel = async () => {
      try {
        setLoading(true);
        
        // ユーザー情報取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasRequiredLevel(false);
          return;
        }
        
        // 性別取得
        const gender = await getUserGender(user.id);
        setUserGender(gender);
        
        // プレミアム状態取得
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single();
          
        setIsPremium(Boolean(profileData?.is_premium));
        
        // 認証状態取得
        const verificationState = await verificationService.getVerificationState(user.id);
        
        // 条件判定 (性別による分岐)
        if (gender === 'female') {
          // 女性の場合：電話番号認証があれば許可
          if (verificationState && verificationState.phoneVerified) {
            setHasRequiredLevel(true);
          } else {
            setHasRequiredLevel(false);
          }
        } else {
          // 男性の場合：プレミアム会員か、認証レベルが十分かをチェック
          if (isPremium || (verificationState && verificationState.verificationLevel >= requiredLevel)) {
            setHasRequiredLevel(true);
          } else {
            setHasRequiredLevel(false);
          }
        }
      } catch (error) {
        console.error('認証/プレミアム状態の確認に失敗しました:', error);
        setHasRequiredLevel(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkVerificationLevel();
  }, [requiredLevel]);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!hasRequiredLevel) {
    // 性別が不明な場合はfallbackMessageを使用
    if (userGender === null) {
      return (
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">認証が必要です</h2>
          
          <p className="text-gray-600 mb-6">
            {fallbackMessage || 
              `この機能を利用するには認証が必要です。プロフィールの設定と認証を完了してください。`}
          </p>
          
          <Link 
            to="/profile/settings" 
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            プロフィール設定へ
          </Link>
        </div>
      );
    }
    
    // 性別に応じたメッセージとUI
    if (userGender === 'female') {
      return (
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">電話番号認証が必要です</h2>
          
          <p className="text-gray-600 mb-6">
            {femaleMessage || 
              `この機能を利用するには電話番号認証が必要です。認証完了後は無料でマッチング機能をお使いいただけます。`}
          </p>
          
          <div className="space-y-2">
            <p className="font-medium">認証すると以下の特典があります：</p>
            <ul className="text-left text-gray-600 list-disc pl-6 mb-6">
              <li>マッチング機能の無料利用</li>
              <li>メッセージ機能の無料利用</li>
              <li>20ポイントのボーナス付与</li>
            </ul>
          </div>
          
          <Link 
            to="/profile/verification" 
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            認証ページへ進む
          </Link>
        </div>
      );
    } else {
      // 男性の場合はプレミアム会員登録を促す
      return (
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-indigo-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">プレミアム会員登録が必要です</h2>
          
          <p className="text-gray-600 mb-6">
            {maleMessage || 
              `この機能を利用するにはプレミアム会員登録が必要です。月額980円でマッチング機能を制限なくご利用いただけます。`}
          </p>
          
          <div className="space-y-2">
            <p className="font-medium">プレミアム会員の特典：</p>
            <ul className="text-left text-gray-600 list-disc pl-6 mb-6">
              <li>マッチング機能の制限なし利用</li>
              <li>メッセージ送信無制限</li>
              <li>毎月100ポイントプレゼント</li>
              <li>検索結果の優先表示</li>
            </ul>
          </div>
          
          <Link 
            to="/premium" 
            className="block w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            プレミアム会員登録へ
          </Link>
        </div>
      );
    }
  }
  
  return <>{children}</>;
};

export default VerificationGuard;