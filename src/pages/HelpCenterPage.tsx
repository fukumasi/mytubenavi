import { Link } from 'react-router-dom';

export default function HelpCenterPage() {
  const helpCategories = [
    {
      title: "アカウント",
      icon: "👤",
      description: "アカウント作成、ログイン、パスワードの変更など",
      links: [
        { name: "アカウント作成方法", path: "/help/account/create" },
        { name: "ログインできない場合", path: "/help/account/login-issues" },
        { name: "パスワードをリセットする", path: "/help/account/reset-password" },
        { name: "アカウント設定の変更", path: "/help/account/settings" }
      ]
    },
    {
      title: "動画視聴",
      icon: "🎬",
      description: "動画の検索、再生、お気に入り登録など",
      links: [
        { name: "動画の検索方法", path: "/help/videos/search" },
        { name: "ジャンル検索の使い方", path: "/help/videos/genres" },
        { name: "お気に入り動画の管理", path: "/help/videos/favorites" },
        { name: "視聴履歴の確認と削除", path: "/help/videos/history" }
      ]
    },
    {
      title: "評価とレビュー",
      icon: "⭐",
      description: "動画の評価、レビュー投稿、コメントなど",
      links: [
        { name: "評価の付け方", path: "/help/reviews/rating" },
        { name: "レビューの書き方", path: "/help/reviews/writing" },
        { name: "コメント機能の使い方", path: "/help/reviews/comments" },
        { name: "不適切なレビュー/コメントの報告", path: "/help/reviews/report" }
      ]
    },
    {
      title: "マッチング",
      icon: "🤝",
      description: "ユーザーマッチング、メッセージ、友達機能など",
      links: [
        { name: "マッチングの仕組み", path: "/help/matching/how-it-works" },
        { name: "マッチング設定のカスタマイズ", path: "/help/matching/preferences" },
        { name: "メッセージの送受信", path: "/help/matching/messaging" },
        { name: "友達の追加と管理", path: "/help/matching/friends" }
      ]
    },
    {
      title: "プレミアム会員",
      icon: "✨",
      description: "プレミアム会員の特典、支払い、解約など",
      links: [
        { name: "プレミアム会員の特典", path: "/help/premium/benefits" },
        { name: "プレミアム会員への登録方法", path: "/help/premium/signup" },
        { name: "お支払い方法の管理", path: "/help/premium/payment" },
        { name: "解約方法", path: "/help/premium/cancel" }
      ]
    },
    {
      title: "YouTuber向け",
      icon: "📹",
      description: "動画掲載、広告プラン、分析レポートなど",
      links: [
        { name: "YouTuber登録の方法", path: "/help/youtuber/registration" },
        { name: "掲載プランの選び方", path: "/help/youtuber/plans" },
        { name: "広告効果の分析方法", path: "/help/youtuber/analytics" },
        { name: "よくある質問", path: "/help/youtuber/faq" }
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          ヘルプセンター
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          MyTubeNaviの使い方についてのガイドと情報
        </p>
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {helpCategories.map((category, index) => (
            <div key={index} className="bg-white dark:bg-dark-surface rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-dark-border">
              <div className="p-6">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{category.icon}</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {category.title}
                  </h3>
                </div>
                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  {category.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {category.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link
                        to={link.path}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 bg-gray-50 dark:bg-dark-surface/50 rounded-lg p-8 border border-gray-200 dark:border-dark-border">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">お探しの情報が見つかりませんか？</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            よくある質問を確認するか、お問い合わせフォームからご連絡ください。
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/faq"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600"
            >
              よくある質問を見る
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}