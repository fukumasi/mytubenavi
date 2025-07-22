import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function PlansPage() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  
  const plans = [
    {
      name: 'スタータープラン',
      monthlyPrice: 4900,
      yearlyPrice: 49000,
      features: [
        'トップページに週1回掲載',
        'ジャンルページに週2回掲載',
        '基本的な分析レポート',
        'サポートチャット（営業日対応）'
      ],
      mostPopular: false,
      buttonText: 'スタータープランを選択'
    },
    {
      name: 'グロースプラン',
      monthlyPrice: 9800,
      yearlyPrice: 98000,
      features: [
        'トップページに週3回掲載',
        'ジャンルページに毎日掲載',
        '検索結果の上位表示',
        '詳細な分析レポート',
        'サポートチャット（平日24時間対応）',
        'ターゲティングオプション'
      ],
      mostPopular: true,
      buttonText: 'グロースプランを選択'
    },
    {
      name: 'プロフェッショナルプラン',
      monthlyPrice: 19800,
      yearlyPrice: 198000,
      features: [
        'トップページに毎日掲載',
        'ジャンルページに常時掲載',
        '検索結果の最上位表示',
        '高度な効果分析ダッシュボード',
        'サポートチャット（24時間365日対応）',
        '詳細なターゲティングオプション',
        'カスタムキャンペーン設定',
        '専任サポート担当者'
      ],
      mostPopular: false,
      buttonText: 'プロフェッショナルプランを選択'
    }
  ];
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          YouTuber向け広告プラン
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          あなたのチャンネルと動画を効果的に宣伝するためのプランをご用意しています
        </p>
      </div>
      
      <div className="mb-12 flex justify-center">
        <div className="relative bg-white dark:bg-dark-surface rounded-lg p-1 flex">
          <button
            type="button"
            className={`relative py-2 px-6 border rounded-md text-sm font-medium ${
              billingPeriod === 'monthly'
                ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-200 dark:border-primary-700 text-primary-800 dark:text-primary-300'
                : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg'
            }`}
            onClick={() => setBillingPeriod('monthly')}
          >
            月払い
          </button>
          <button
            type="button"
            className={`relative ml-0.5 py-2 px-6 border rounded-md text-sm font-medium ${
              billingPeriod === 'yearly'
                ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-200 dark:border-primary-700 text-primary-800 dark:text-primary-300'
                : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg'
            }`}
            onClick={() => setBillingPeriod('yearly')}
          >
            年払い <span className="text-green-600 dark:text-green-400 font-medium">（2ヶ月分お得）</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <div 
            key={index} 
            className={`
              relative bg-white dark:bg-dark-surface border rounded-lg shadow-sm overflow-hidden
              ${plan.mostPopular 
                ? 'border-primary-500 dark:border-primary-600 ring-2 ring-primary-500 dark:ring-primary-600' 
                : 'border-gray-200 dark:border-gray-700'}
            `}
          >
            {plan.mostPopular && (
              <div className="absolute top-0 inset-x-0 transform translate-y-px">
                <div className="flex justify-center transform -translate-y-1/2">
                  <span className="inline-flex rounded-full bg-primary-600 dark:bg-primary-700 px-4 py-1 text-xs font-semibold tracking-wider uppercase text-white">
                    人気プラン
                  </span>
                </div>
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  ¥{billingPeriod === 'monthly' 
                    ? plan.monthlyPrice.toLocaleString() 
                    : plan.yearlyPrice.toLocaleString()}
                </span>
                <span className="ml-1 text-xl font-semibold text-gray-500 dark:text-gray-400">
                  {billingPeriod === 'monthly' ? '/月' : '/年'}
                </span>
              </div>
              
              <ul className="mt-6 space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8">
                <Link
                  to="/youtuber/register"
                  className={`block w-full py-3 px-4 rounded-md shadow text-center text-sm font-medium ${
                    plan.mostPopular
                      ? 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600'
                      : 'bg-white text-primary-600 border border-primary-600 hover:bg-gray-50 dark:bg-dark-surface dark:text-primary-400 dark:border-primary-500 dark:hover:bg-dark-bg'
                  }`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-16 bg-gray-50 dark:bg-dark-surface/50 rounded-lg p-8 border border-gray-200 dark:border-dark-border">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">カスタムプラン</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          特別なニーズやより大規模なプロモーションをご希望の場合は、ご予算や目標に合わせたカスタムプランをご用意します。
          詳細については、お問い合わせください。
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg"
        >
          お問い合わせ
        </Link>
      </div>
      
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">よくある質問</h2>
        
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-dark-border">
            <div className="divide-y divide-gray-200 dark:divide-dark-border">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  掲載の審査基準はありますか？
                </h3>
                <div className="mt-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    はい、すべての掲載内容はMyTubeNaviのコンテンツポリシーに基づいて審査されます。
                    違法なコンテンツ、著作権侵害、誹謗中傷、差別的内容、暴力的内容などは掲載できません。
                    詳細はガイドラインをご覧ください。
                  </p>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  掲載開始までにどれくらい時間がかかりますか？
                </h3>
                <div className="mt-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    通常、申請から1〜2営業日で審査が完了します。審査通過後、すぐに掲載が開始されます。
                    急ぎの場合は、プロフェッショナルプランの優先審査オプションをご利用ください。
                  </p>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  途中でプランを変更することはできますか？
                </h3>
                <div className="mt-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    はい、いつでもプランのアップグレードが可能です。月の途中でアップグレードした場合、
                    差額を日割りで計算して請求します。ダウングレードは次の請求サイクルから適用されます。
                  </p>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  掲載する動画の条件はありますか？
                </h3>
                <div className="mt-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    掲載動画はYouTubeコミュニティガイドラインに準拠している必要があります。
                    また、動画の品質や内容がMyTubeNaviユーザーにとって価値があるかどうかも審査の対象となります。
                    低品質な動画や過度に派手なサムネイルなどは掲載を見送る場合があります。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}