import { Link } from 'react-router-dom';

export default function GuidePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          YouTuber向け掲載ガイド
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          MyTubeNaviであなたのチャンネルと動画を宣伝しましょう
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-dark-border mb-10">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">MyTubeNaviでの掲載メリット</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 dark:bg-primary-600 text-white">
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">ターゲット視聴者にリーチ</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    あなたの動画に興味を持つ可能性が高いユーザーに的確にアプローチできます。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 dark:bg-primary-600 text-white">
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">詳細な分析レポート</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    インプレッション数、クリック率、視聴者層など、広告効果を詳細に分析できます。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 dark:bg-primary-600 text-white">
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">ブランド認知度の向上</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    あなたのチャンネルの認知度を高め、新しいファン獲得につなげます。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 dark:bg-primary-600 text-white">
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">コスト効率の良い宣伝</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    予算や目標に合わせた柔軟なプランで、効率的に宣伝活動を行えます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-dark-border mb-10">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">掲載までの流れ</h2>
            
            <div className="space-y-12">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 font-bold text-lg">
                    1
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">YouTuber登録</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    まずはMyTubeNaviにYouTuberとして登録します。YouTubeチャンネルの認証が必要です。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 font-bold text-lg">
                    2
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">広告プランの選択</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    ニーズに合った広告プランを選びます。トップページ掲載、ジャンルページ掲載、検索結果掲載など様々な選択肢があります。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 font-bold text-lg">
                    3
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">掲載動画の登録</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    宣伝したい動画を選択し、簡単な説明文やアピールポイントを登録します。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 font-bold text-lg">
                    4
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">審査</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    登録内容がガイドラインに沿っているかを確認します。通常は1〜2営業日で審査が完了します。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 font-bold text-lg">
                    5
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">掲載開始と効果測定</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    掲載開始後は、リアルタイムでパフォーマンスを確認できます。データに基づいて掲載内容を最適化することも可能です。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">さっそく始めてみませんか？</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            MyTubeNaviでチャンネルの成長を加速させましょう。詳細は広告プランをご覧ください。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/youtuber/plans"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600"
            >
              広告プランを見る
            </Link>
            <Link
              to="/youtuber/register"
              className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg"
            >
              YouTuber登録
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}