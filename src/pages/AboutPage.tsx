export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          会社概要
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          MyTubeNavi - YouTubeの価値を高めるプラットフォーム
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="prose prose-lg dark:prose-invert mx-auto">
          <section className="mb-12">
            <h2>私たちのミッション</h2>
            <p>
              MyTubeNaviは、YouTube動画視聴体験をより豊かで効率的なものにするため、
              最高のナビゲーションとコミュニティプラットフォームを提供することを目指しています。
              私たちは、視聴者と動画制作者（YouTuber）の双方にとって価値あるエコシステムを構築し、
              質の高いコンテンツとその視聴者をつなぐ橋渡しとなることで、YouTubeの価値をさらに高めることを使命としています。
            </p>
          </section>
          
          <section className="mb-12">
            <h2>私たちの価値観</h2>
            <ul>
              <li>
                <strong>ユーザー中心</strong> - すべての機能とサービスはユーザーの視点を第一に考えて設計されています。
              </li>
              <li>
                <strong>コミュニティの力</strong> - 同じ興味を持つ人々がつながることで生まれる新たな価値を重視しています。
              </li>
              <li>
                <strong>透明性と信頼</strong> - オープンで誠実なコミュニケーションを通じて、ユーザーとの信頼関係を築きます。
              </li>
              <li>
                <strong>クリエイター支援</strong> - YouTubeクリエイターが成長するための環境と機会を提供します。
              </li>
              <li>
                <strong>継続的改善</strong> - 常にユーザーフィードバックを取り入れ、サービスの品質向上に努めます。
              </li>
            </ul>
          </section>
          
          <section className="mb-12">
            <h2>私たちの歩み</h2>
            <p>
              MyTubeNaviは、YouTube利用者が直面する「良質な動画を効率的に見つける難しさ」という課題に着目したチームによって、
              2024年に設立されました。初期バージョンでは検索機能と評価システムのみを提供していましたが、
              ユーザーからのフィードバックを取り入れながら、マッチング機能やYouTuber向けの広告プラットフォームなど、
              サービスの幅を広げてきました。今後も進化し続けるプラットフォームとして、さらなる機能拡張を予定しています。
            </p>
          </section>
          
          <section className="mb-12">
            <h2>私たちのチーム</h2>
            <p>
              MyTubeNaviのチームは、テクノロジー、デザイン、マーケティングなど様々な分野の専門家で構成されています。
              私たちは多様性を重視し、異なる視点や経験を持つメンバーが協力することで、より優れたサービスを創造できると信じています。
              全員がYouTubeの熱心な視聴者でもあり、自分たちが使いたいと思えるプラットフォームの開発に情熱を注いでいます。
            </p>
          </section>
          
          <section className="mb-12">
            <h2>会社情報</h2>
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="py-4 pr-6 text-sm font-medium text-gray-900 dark:text-white">会社名</td>
                  <td className="py-4 pl-6 text-sm text-gray-500 dark:text-gray-400">**************</td>
                </tr>
                <tr>
                  <td className="py-4 pr-6 text-sm font-medium text-gray-900 dark:text-white">設立</td>
                  <td className="py-4 pl-6 text-sm text-gray-500 dark:text-gray-400">****年**月</td>
                </tr>
                <tr>
                  <td className="py-4 pr-6 text-sm font-medium text-gray-900 dark:text-white">所在地</td>
                  <td className="py-4 pl-6 text-sm text-gray-500 dark:text-gray-400">〒XXX-XXXX 東京都XX区XX町X-X-X XXビル X階</td>
                </tr>
                <tr>
                  <td className="py-4 pr-6 text-sm font-medium text-gray-900 dark:text-white">代表者</td>
                  <td className="py-4 pl-6 text-sm text-gray-500 dark:text-gray-400">******</td>
                </tr>
                <tr>
                  <td className="py-4 pr-6 text-sm font-medium text-gray-900 dark:text-white">事業内容</td>
                  <td className="py-4 pl-6 text-sm text-gray-500 dark:text-gray-400">
                    YouTube動画検索プラットフォームの運営<br />
                    コミュニティサービスの提供<br />
                    YouTuber向け広告プラットフォームの運営
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
          
          <section>
            <h2>お問い合わせ</h2>
            <p>
              サービスに関するお問い合わせやご意見・ご要望は、
              <a href="/contact" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                お問い合わせフォーム
              </a>
              からお寄せください。採用情報や取材のお問い合わせも、同フォームからお願いいたします。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}