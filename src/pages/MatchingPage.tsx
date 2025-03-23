// src/pages/MatchingPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MatchingDashboard from '../components/matching/MatchingDashboard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { toast, Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { usePoints } from '../hooks/usePoints';

const MatchingPage: React.FC = () => {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [verificationLevel, setVerificationLevel] = useState<number>(0);
  const { balance: pointBalance, loading: pointsLoading } = usePoints();

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
      // ユーザー認証レベルを取得
      const { data, error } = await supabase
        .from('user_verification')
        .select('verification_level')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116はレコードが見つからない場合のエラーコード
        throw error;
      }

      setVerificationLevel(data?.verification_level || 1);
    } catch (error) {
      console.error('ユーザーステータスの取得に失敗しました:', error);
      toast.error('ユーザー情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
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
                onClick={() => navigate('/verification')}
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
          
          {/* マッチング設定パネル */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-lg mb-3 text-gray-800">マッチング設定</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">マッチング範囲</label>
                <select className="w-full p-2 border rounded-md bg-gray-50">
                  <option>すべてのユーザー</option>
                  <option>動画投稿者のみ</option>
                  <option>視聴者のみ</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 block mb-1">ジャンル優先度</label>
                <select className="w-full p-2 border rounded-md bg-gray-50">
                  <option>すべてのジャンル</option>
                  <option>エンターテイメント</option>
                  <option>情報・知識</option>
                  <option>ライフスタイル</option>
                  <option>クリエイティブ</option>
                </select>
              </div>
              
              {isPremium && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">年齢層</label>
                    <select className="w-full p-2 border rounded-md bg-gray-50">
                      <option>指定なし</option>
                      <option>18-24歳</option>
                      <option>25-34歳</option>
                      <option>35-44歳</option>
                      <option>45-54歳</option>
                      <option>55歳以上</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">活動レベル</label>
                    <select className="w-full p-2 border rounded-md bg-gray-50">
                      <option>指定なし</option>
                      <option>非常に活発</option>
                      <option>活発</option>
                      <option>普通</option>
                      <option>カジュアル</option>
                    </select>
                  </div>
                </>
              )}
              
              {!isPremium && (
                <div className="bg-gray-100 rounded-md p-3 text-xs text-gray-600">
                  <p className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    プレミアム会員になると詳細なフィルター設定が利用できます
                  </p>
                </div>
              )}
              
              <button className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                設定を適用
              </button>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <MatchingDashboard />
        </div>
      </div>
    </div>
  );
};

export default MatchingPage;