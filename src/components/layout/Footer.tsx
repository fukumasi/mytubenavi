export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              サービス
            </h3>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  動画検索
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  ジャンル一覧
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  マッチング
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              サポート
            </h3>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  ヘルプセンター
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  お問い合わせ
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  よくある質問
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              会社情報
            </h3>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  会社概要
                </a>
              </li>
              <li>
                <a 
                  href="/privacy-policy.html" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  プライバシーポリシー
                </a>
              </li>
              <li>
                <a 
                  href="/terms-of-service.html"
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  利用規約
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              YouTuber向け
            </h3>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  掲載について
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  広告プラン
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  ガイドライン
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500 text-center">
            &copy; 2024 MyTubeNavi. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}