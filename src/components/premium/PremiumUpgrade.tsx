// src/components/premium/PremiumUpgrade.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PremiumPaymentForm from './PremiumPaymentForm';
import { useStripeContext } from '@/contexts/StripeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface PlanOption {
  id: string;
  name: string;
  price: number;
  duration: number; // 月数
  features: string[];
  recommended?: boolean;
}

const PremiumUpgrade: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { resetPaymentState, paymentSuccess } = useStripeContext();
  const [userGender, setUserGender] = useState<string | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);
  
  const plans: PlanOption[] = [
    {
      id: 'monthly',
      name: '月額プラン',
      price: 980,
      duration: 1,
      features: [
        'すべての通知を受信',
        '10件のマッチング候補表示',
        '広告表示の削減',
        'マッチング機能フル利用'
      ]
    },
    {
      id: 'yearly',
      name: '年間プラン',
      price: 9800,
      duration: 12,
      features: [
        'すべての通知を受信',
        '10件のマッチング候補表示',
        '広告表示の削減',
        'マッチング機能フル利用',
        '年額2か月分お得'
      ],
      recommended: true
    },
    {
      id: 'quarterly',
      name: '3ヶ月プラン',
      price: 2800,
      duration: 3,
      features: [
        'すべての通知を受信',
        '10件のマッチング候補表示',
        '広告表示の削減',
        'マッチング機能フル利用',
        '月額より5%お得'
      ]
    }
  ];

  useEffect(() => {
    // コンポーネントマウント時に決済状態をリセット
    resetPaymentState();
    
    // ユーザー情報を取得（性別と電話番号認証状態を含む）
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_premium, premium_expiry, gender, is_phone_verified')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setUserGender(data.gender);
          setIsPhoneVerified(data.is_phone_verified || false);
          
          // すでにプレミアム会員の場合はダッシュボードへリダイレクト
          if (data.is_premium && new Date(data.premium_expiry) > new Date()) {
            navigate('/premium/dashboard');
          }
          
          // 女性ユーザーで電話番号認証済みの場合は自動的にプレミアム付与
          if (data.gender === 'female' && data.is_phone_verified && !data.is_premium) {
            await activateFemaleUserPremium();
          }
        }
      } catch (err) {
        console.error('ユーザープロフィール取得中にエラーが発生しました:', err);
      }
    };
    
    fetchUserProfile();
    
    // クリーンアップ関数
    return () => {
      resetPaymentState();
    };
  }, [user, navigate, resetPaymentState]);

  // 決済成功後の処理
  useEffect(() => {
    if (paymentSuccess) {
      // 支払い成功時、ダッシュボードにリダイレクト
      navigate('/premium/dashboard', { 
        state: { 
          success: true, 
          message: 'プレミアム会員へのアップグレードが完了しました！'
        } 
      });
    }
  }, [paymentSuccess, navigate]);

  // 女性ユーザー向けのプレミアム自動付与処理
  const activateFemaleUserPremium = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 1年間の有効期限を設定
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      
      // プロフィールテーブルのプレミアムステータスを更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_plan: 'female_free',
          premium_expiry: expiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      // 支払い履歴テーブルに記録を追加（金額0円の特別プラン）
      const { error: insertError } = await supabase
        .from('premium_payments')
        .insert({
          user_id: user.id,
          plan: 'female_free',
          amount: 0,
          payment_method: 'gender_policy',
          status: 'completed',
          expires_at: expiry.toISOString()
        });
      
      if (insertError) throw insertError;
      
      // プロフィール更新履歴に記録
      const { error: profileUpdateError } = await supabase
        .from('profile_updates')
        .insert({
          profile_id: user.id,
          updated_by: user.id,
          update_type: 'premium_status',
          old_value: JSON.stringify({ is_premium: false }),
          new_value: JSON.stringify({ is_premium: true, plan: 'female_free' }),
          note: '女性ユーザー向け無料プレミアム特典が適用されました'
        });
      
      if (profileUpdateError) throw profileUpdateError;
      
      // 成功したらプレミアムダッシュボードへリダイレクト
      navigate('/premium/dashboard', {
        state: {
          success: true,
          message: '電話番号認証が完了しました。女性ユーザー向け特典として、プレミアム機能が無料で有効化されました！'
        }
      });
    } catch (err: any) {
      console.error('女性ユーザーのプレミアム特典付与中にエラーが発生しました:', err);
      setError('プレミアム特典の有効化に失敗しました。もう一度お試しいただくか、サポートにお問い合わせください。');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/login', { state: { redirectTo: '/premium/upgrade' } });
      return;
    }

    // 女性ユーザーで電話番号認証がまだの場合は認証画面へ
    if (userGender === 'female' && !isPhoneVerified) {
      navigate('/profile/verification', { 
        state: { 
          message: '電話番号認証を完了すると、プレミアム機能が無料で利用できます。' 
        } 
      });
      return;
    }

    // 男性ユーザーの場合はStripe決済画面を表示
    if (userGender === 'male' || userGender === null) {
      setShowPaymentForm(true);
    }
  };

  const handlePaymentSuccess = (subscriptionId: string) => {
    // 支払い成功後、ダッシュボードにリダイレクト
    navigate('/premium/dashboard', { 
      state: { 
        success: true, 
        message: 'プレミアム会員へのアップグレードが完了しました！',
        subscriptionId
      } 
    });
  };
  
  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
  };

  // 仮の決済処理（開発中のため）
  const handleTempUpgrade = async () => {
    if (!user) {
      navigate('/login', { state: { redirectTo: '/premium/upgrade' } });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ここでStripe決済への遷移を実装する予定
      // 今回は仮実装としてプレミアムステータスを直接更新
      const selectedPlanDetails = plans.find(plan => plan.id === selectedPlan);
      if (!selectedPlanDetails) throw new Error('無効なプランです');

      // 有効期限の計算（現在の日付から選択されたプランの期間を加算）
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + selectedPlanDetails.duration);

      // プロフィールテーブルのプレミアムステータスを更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_plan: selectedPlan,
          premium_expiry: expiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 支払い履歴テーブルに記録を追加（本来はStripe決済成功後に行う）
      const { error: insertError } = await supabase
        .from('premium_payments')
        .insert({
          user_id: user.id,
          plan: selectedPlan,
          amount: selectedPlanDetails.price,
          payment_method: 'test_payment', // 実際の実装では "stripe" など
          status: 'completed',
          expires_at: expiry.toISOString()
        });

      if (insertError) throw insertError;

      // プロフィール更新履歴に記録
      const { error: profileUpdateError } = await supabase
        .from('profile_updates')
        .insert({
          profile_id: user.id,
          updated_by: user.id,
          update_type: 'premium_status',
          old_value: JSON.stringify({ is_premium: false }),
          new_value: JSON.stringify({ is_premium: true, plan: selectedPlan }),
          note: 'テスト決済によるプレミアム会員登録'
        });

      if (profileUpdateError) {
        console.error('プロフィール更新履歴の記録中にエラーが発生しました:', profileUpdateError);
        // ここではエラーをスローせず、プロフィール更新の失敗はログのみにする
      }

      // 成功したらプレミアムダッシュボードへリダイレクト
      navigate('/premium/dashboard', { 
        state: { 
          success: true, 
          message: 'プレミアム会員へのアップグレードが完了しました！' 
        } 
      });
    } catch (err: any) {
      console.error('プレミアム登録中にエラーが発生しました:', err);
      setError('プレミアム会員登録に失敗しました。もう一度お試しください。' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = (plan: PlanOption) => {
    const isSelected = selectedPlan === plan.id;
    return (
      <div 
        key={plan.id}
        className={`border rounded-lg p-6 transition-all ${
          isSelected 
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 shadow-md' 
            : 'border-gray-200 dark:border-dark-border dark:bg-dark-surface hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-sm'
        } ${plan.recommended ? 'relative' : ''}`}
        onClick={() => handlePlanSelect(plan.id)}
      >
        {plan.recommended && (
          <div className="absolute top-0 right-0 bg-yellow-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
            おすすめ
          </div>
        )}
        <h3 className="text-xl font-bold mb-2 dark:text-dark-text-primary">{plan.name}</h3>
        <div className="text-3xl font-bold mb-4 dark:text-dark-text-primary">
          ¥{plan.price.toLocaleString()}
          <span className="text-base font-normal ml-1 text-gray-600 dark:text-dark-text-secondary">
            {plan.duration === 1 ? '/月' : `/${plan.duration}ヶ月`}
          </span>
        </div>
        <div className="mb-4">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start mb-2">
              <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
              <span className="dark:text-dark-text-primary">{feature}</span>
            </div>
          ))}
        </div>
        <button
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isSelected 
              ? 'bg-blue-600 dark:bg-blue-700 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {isSelected ? '選択中' : '選択する'}
        </button>
      </div>
    );
  };

  // 女性ユーザー向けの特別メッセージ表示
  const renderFemaleUserMessage = () => {
    if (userGender !== 'female') return null;
    
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-bold text-green-800 dark:text-green-400 mb-2">
          <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
          女性ユーザー向け特別特典
        </h2>
        {isPhoneVerified ? (
          <div>
            <p className="text-green-700 dark:text-green-400 mb-2">
              電話番号認証が完了しています。プレミアム機能をすべて無料でご利用いただけます！
            </p>
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-all text-sm"
              onClick={() => navigate('/premium/dashboard')}
            >
              プレミアムダッシュボードへ
            </button>
          </div>
        ) : (
          <div>
            <p className="text-green-700 dark:text-green-400 mb-2">
              女性ユーザーは電話番号認証を完了するだけで、すべてのプレミアム機能を無料でご利用いただけます。
            </p>
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-all text-sm"
              onClick={() => navigate('/profile/verification')}
            >
              電話番号認証へ進む
            </button>
          </div>
        )}
      </div>
    );
  };

  // 決済フォーム表示モードの場合
  if (showPaymentForm) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-bg">
        <div className="max-w-4xl mx-auto px-4 py-8 bg-white dark:bg-dark-surface rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold mb-6 dark:text-dark-text-primary">プレミアム会員のお支払い</h1>
          
          <PremiumPaymentForm 
            selectedPlan={selectedPlan as 'monthly' | 'quarterly' | 'yearly'}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />

          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 text-blue-800 dark:text-blue-300 rounded-r">
            <p className="text-sm">
              <strong>お支払い情報は安全に処理されます。</strong> クレジットカード情報はStripeの安全な環境で保管され、当サイトのサーバーには保存されません。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      <div className="max-w-6xl mx-auto px-4 py-8 bg-white dark:bg-dark-surface rounded-lg shadow-sm">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-3">
            <span className="text-4xl text-yellow-500">👑</span>
          </div>
          <h1 className="text-3xl font-bold mb-2 dark:text-dark-text-primary">MyTubeNaviプレミアム</h1>
          <p className="text-xl text-gray-600 dark:text-dark-text-secondary mb-4">YouTube体験をさらに向上させる特別な機能を解放</p>
          <div className="max-w-3xl mx-auto">
            <p className="text-gray-700 dark:text-dark-text-secondary">
              プレミアム会員になると、充実したマッチング機能、すべての通知、広告表示の削減などの特典が利用できます。
              あなたのYouTube視聴体験を最大限にサポートします。
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {/* 女性ユーザー向け特別メッセージ */}
        {renderFemaleUserMessage()}

        {/* 男性ユーザーまたは性別未設定の場合のみプラン表示 */}
        {(userGender === 'male' || userGender === null) && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {plans.map(renderPlanCard)}
            </div>

            <div className="bg-gray-50 dark:bg-dark-surface/50 border dark:border-dark-border rounded-lg p-8 mb-12">
              <h2 className="text-2xl font-bold mb-6 dark:text-dark-text-primary">プレミアム会員の特典</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <span className="text-2xl text-blue-600 dark:text-blue-400">👥</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 dark:text-dark-text-primary">マッチング機能フル利用</h3>
                    <p className="text-gray-600 dark:text-dark-text-secondary">趣味や興味が合うユーザーとつながり、YouTube体験を共有できます。</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <span className="text-2xl text-blue-600 dark:text-blue-400">🔔</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 dark:text-dark-text-primary">すべての通知</h3>
                    <p className="text-gray-600 dark:text-dark-text-secondary">重要な更新やお気に入りチャンネルの新着動画をリアルタイムで受け取れます。</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <span className="text-2xl text-blue-600 dark:text-blue-400">🔍</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 dark:text-dark-text-primary">高度な検索機能</h3>
                    <p className="text-gray-600 dark:text-dark-text-secondary">詳細な条件で動画を検索し、あなたが求めるコンテンツを素早く見つけられます。</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <span className="text-2xl text-blue-600 dark:text-blue-400">⭐</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 dark:text-dark-text-primary">広告表示の削減</h3>
                    <p className="text-gray-600 dark:text-dark-text-secondary">サイト内の広告が減少し、よりクリーンな体験を楽しめます。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleUpgrade}
                  disabled={loading}
                >
                  {loading ? '処理中...' : `Stripeで支払う (¥${plans.find(p => p.id === selectedPlan)?.price.toLocaleString()})`}
                </button>
                
                <button
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-8 rounded-lg shadow-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleTempUpgrade}
                  disabled={loading}
                >
                  {loading ? '処理中...' : `テスト登録 (実際の決済なし)`}
                </button>
              </div>
              
              <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 text-yellow-800 dark:text-yellow-400 rounded-r text-left">
                <p>
                  <strong>開発中の機能：</strong> Stripe決済システムはテスト段階です。実際の決済を行う前に、テスト登録ボタンでプレミアム機能をお試しいただけます。
                </p>
              </div>
              
              <p className="mt-4 text-gray-600 dark:text-dark-text-secondary text-sm">
                登録することで、<a href="/terms-of-service" className="text-blue-600 dark:text-blue-400 hover:underline">利用規約</a>と
                <a href="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">プライバシーポリシー</a>に同意したものとみなされます。
                いつでもキャンセル可能です。
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PremiumUpgrade;