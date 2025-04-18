// src/components/profile/VerificationPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import verificationService, { VerificationState, VerificationLevel } from '@/services/verificationService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast, Toaster } from 'react-hot-toast';
import PhoneVerification from './PhoneVerification';

const VerificationPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);
  
  // 認証状態の取得
  useEffect(() => {
    const fetchVerificationState = async () => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }
      
      setLoading(true);
      
      try {
        const state = await verificationService.getVerificationState();
        setVerificationState(state);
      } catch (error) {
        console.error('Failed to fetch verification state:', error);
        toast.error('認証状態の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVerificationState();
  }, [isAuthenticated, navigate]);
  
  // 電話番号認証完了時のコールバック
  const handleVerificationComplete = async () => {
    // 認証状態を再取得
    try {
      const state = await verificationService.getVerificationState();
      setVerificationState(state);
      toast.success('電話番号認証が完了しました！20ポイントが付与されました。');
    } catch (error) {
      console.error('Failed to fetch verification state:', error);
    }
  };
  
  // 認証バッジの表示
  const renderVerificationBadge = (level: VerificationLevel) => {
    const currentLevel = verificationState?.verificationLevel || VerificationLevel.EMAIL_ONLY;
    
    if (currentLevel >= level) {
      return (
        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
          認証済み
        </span>
      );
    }
    
    return (
      <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
        未認証
      </span>
    );
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="max-w-xl mx-auto p-6">
      <Toaster position="top-right" />
      
      <h1 className="text-2xl font-bold mb-6">アカウント認証</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">認証レベル</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <span className="font-medium">メール認証</span>
              {renderVerificationBadge(VerificationLevel.EMAIL_ONLY)}
            </div>
            <span className="text-green-600">完了</span>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <span className="font-medium">電話番号認証</span>
              {renderVerificationBadge(VerificationLevel.PHONE_VERIFIED)}
            </div>
            {verificationState?.phoneVerified ? (
              <span className="text-green-600">完了</span>
            ) : (
              <span className="text-blue-600">認証が必要です</span>
            )}
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg opacity-70">
            <div>
              <span className="font-medium">身分証明書認証</span>
              {renderVerificationBadge(VerificationLevel.ID_VERIFIED)}
            </div>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              準備中
            </span>
          </div>
        </div>
      </div>
      
      {!verificationState?.phoneVerified ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <PhoneVerification onVerificationComplete={handleVerificationComplete} />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">電話番号認証済み</h2>
          
          <div className="mb-4">
            <p className="text-gray-600 mb-2">
              あなたの電話番号（{verificationState.phoneNumber}）は認証済みです。
              マッチング機能やメッセージ機能が利用可能です。
            </p>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="font-medium text-green-600">認証ボーナス：20ポイント獲得済み</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 text-center">
        <button
          className="text-blue-500 hover:text-blue-700"
          onClick={() => navigate('/profile')}
        >
          プロフィールに戻る
        </button>
      </div>
    </div>
  );
};

export default VerificationPage;