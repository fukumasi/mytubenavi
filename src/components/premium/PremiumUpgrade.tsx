import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PremiumPaymentForm from './PremiumPaymentForm';
import { useStripeContext } from '../../contexts/StripeContext';

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
    
    // ユーザーがすでにプレミアム会員かチェック
    const checkPremiumStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_premium, premium_expiry')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data && data.is_premium && new Date(data.premium_expiry) > new Date()) {
          // すでにプレミアム会員の場合はダッシュボードへリダイレクト
          navigate('/premium/dashboard');
        }
      } catch (err) {
        console.error('プレミアムステータスの確認中にエラーが発生しました:', err);
      }
    };
    
    checkPremiumStatus();
    
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

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/login', { state: { redirectTo: '/premium/upgrade' } });
      return;
    }

    // Stripe決済画面を表示
    setShowPaymentForm(true);
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
            ? 'border-blue-600 bg-blue-50 shadow-md' 
            : 'border-gray-200 hover:border-blue-400 hover:shadow-sm'
        } ${plan.recommended ? 'relative' : ''}`}
        onClick={() => handlePlanSelect(plan.id)}
      >
        {plan.recommended && (
          <div className="absolute top-0 right-0 bg-yellow-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
            おすすめ
          </div>
        )}
        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
        <div className="text-3xl font-bold mb-4">
          ¥{plan.price.toLocaleString()}
          <span className="text-base font-normal ml-1 text-gray-600">
            {plan.duration === 1 ? '/月' : `/${plan.duration}ヶ月`}
          </span>
        </div>
        <div className="mb-4">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start mb-2">
              <span className="text-green-500 mr-2">✓</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <button
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isSelected 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {isSelected ? '選択中' : '選択する'}
        </button>
      </div>
    );
  };

  // 決済フォーム表示モードの場合
  if (showPaymentForm) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">プレミアム会員のお支払い</h1>
        
        <PremiumPaymentForm 
          selectedPlan={selectedPlan as 'monthly' | 'quarterly' | 'yearly'}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />

        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 text-blue-800 rounded-r">
          <p className="text-sm">
            <strong>お支払い情報は安全に処理されます。</strong> クレジットカード情報はStripeの安全な環境で保管され、当サイトのサーバーには保存されません。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-3">
          <span className="text-4xl text-yellow-500">👑</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">MyTubeNaviプレミアム</h1>
        <p className="text-xl text-gray-600 mb-4">YouTube体験をさらに向上させる特別な機能を解放</p>
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-700">
            プレミアム会員になると、充実したマッチング機能、すべての通知、広告表示の削減などの特典が利用できます。
            あなたのYouTube視聴体験を最大限にサポートします。
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map(renderPlanCard)}
      </div>

      <div className="bg-gray-50 rounded-lg p-8 mb-12">
        <h2 className="text-2xl font-bold mb-6">プレミアム会員の特典</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex">
            <div className="flex-shrink-0 mr-4">
              <span className="text-2xl text-blue-600">👥</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">マッチング機能フル利用</h3>
              <p className="text-gray-600">趣味や興味が合うユーザーとつながり、YouTube体験を共有できます。</p>
            </div>
          </div>
          <div className="flex">
            <div className="flex-shrink-0 mr-4">
              <span className="text-2xl text-blue-600">🔔</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">すべての通知</h3>
              <p className="text-gray-600">重要な更新やお気に入りチャンネルの新着動画をリアルタイムで受け取れます。</p>
            </div>
          </div>
          <div className="flex">
            <div className="flex-shrink-0 mr-4">
              <span className="text-2xl text-blue-600">🔍</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">高度な検索機能</h3>
              <p className="text-gray-600">詳細な条件で動画を検索し、あなたが求めるコンテンツを素早く見つけられます。</p>
            </div>
          </div>
          <div className="flex">
            <div className="flex-shrink-0 mr-4">
              <span className="text-2xl text-blue-600">⭐</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">広告表示の削減</h3>
              <p className="text-gray-600">サイト内の広告が減少し、よりクリーンな体験を楽しめます。</p>
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
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-lg shadow-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleTempUpgrade}
            disabled={loading}
          >
            {loading ? '処理中...' : `テスト登録 (実際の決済なし)`}
          </button>
        </div>
        
        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 text-yellow-800 rounded-r text-left">
          <p>
            <strong>開発中の機能：</strong> Stripe決済システムはテスト段階です。実際の決済を行う前に、テスト登録ボタンでプレミアム機能をお試しいただけます。
          </p>
        </div>
        
        <p className="mt-4 text-gray-600 text-sm">
          登録することで、<a href="/terms-of-service" className="text-blue-600 hover:underline">利用規約</a>と
          <a href="/privacy-policy" className="text-blue-600 hover:underline">プライバシーポリシー</a>に同意したものとみなされます。
          いつでもキャンセル可能です。
        </p>
      </div>
    </div>
  );
};

export default PremiumUpgrade;