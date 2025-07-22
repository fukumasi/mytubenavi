import { useState } from 'react';
import { Link } from 'react-router-dom';

// FAQのカテゴリーの型定義
type CategoryId = 'general' | 'account' | 'videos' | 'reviews' | 'premium' | 'youtuber' | 'matching';

// FAQの型定義
interface FAQ {
  question: string;
  answer: string;
}

// カテゴリー情報の型定義
interface Category {
  id: CategoryId;
  name: string;
}

// 全FAQデータの型定義
interface FAQs {
  general: FAQ[];
  account: FAQ[];
  videos: FAQ[];
  reviews: FAQ[];
  premium: FAQ[];
  youtuber: FAQ[];
  matching: FAQ[];
}

// openQuestionsの型定義
interface OpenQuestions {
  [key: number]: boolean;
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('general');
  
  const categories: Category[] = [
    { id: 'general', name: '一般的な質問' },
    { id: 'account', name: 'アカウント' },
    { id: 'videos', name: '動画視聴' },
    { id: 'reviews', name: '評価とレビュー' },
    { id: 'premium', name: 'プレミアム会員' },
    { id: 'youtuber', name: 'YouTuber向け' },
    { id: 'matching', name: 'マッチング' }
  ];
  
  const faqs: FAQs = {
    general: [
      {
        question: 'MyTubeNaviとは何ですか？',
        answer: 'MyTubeNaviは、YouTube動画検索を効率化し、口コミ評価・コミュニティ機能を提供するプラットフォームです。ユーザー同士が評価を共有したり、同じ興味を持つ人とつながったりすることができます。'
      },
      {
        question: 'MyTubeNaviは無料で利用できますか？',
        answer: 'はい、基本機能は無料で利用できます。動画検索や評価の閲覧などの基本機能は無料でご利用いただけます。マッチング機能の完全版や一部の高度な機能はプレミアム会員向けに提供しています。'
      },
      {
        question: '問題や不具合を報告するにはどうすればいいですか？',
        answer: '問題や不具合はお問い合わせフォームから報告できます。できるだけ詳細な情報（デバイス、ブラウザ、発生状況など）を含めていただけると、より迅速に対応できます。'
      },
      {
        question: 'サポートへの連絡方法は？',
        answer: 'サポートへの連絡は「お問い合わせ」ページのフォームからお願いします。通常、営業日3日以内に返信いたします。'
      }
    ],
    account: [
      {
        question: 'アカウントの登録方法は？',
        answer: 'トップページ右上の「登録」ボタンをクリックし、メールアドレスとパスワードを入力するか、GoogleアカウントまたはFacebookアカウントでの登録が可能です。'
      },
      {
        question: 'パスワードを忘れた場合はどうすればいいですか？',
        answer: 'ログイン画面の「パスワードをお忘れですか？」リンクをクリックし、登録したメールアドレスを入力してください。パスワードリセット用のリンクをメールで送信します。'
      },
      {
        question: 'アカウントの削除方法は？',
        answer: 'アカウント設定ページの「アカウント管理」タブから「アカウントを削除」オプションを選択してください。削除前に確認画面が表示されます。'
      },
      {
        question: 'プロフィール情報はどこで変更できますか？',
        answer: 'ログイン後、右上のアイコンをクリックし「プロフィール設定」を選択すると、プロフィール情報の編集が可能です。'
      }
    ],
    videos: [
      {
        question: '動画はどのように検索できますか？',
        answer: 'トップページの検索バーにキーワードを入力するか、ジャンルアイコンをクリックして特定のジャンルの動画を閲覧できます。検索結果は人気順、評価順などで並べ替えできます。'
      },
      {
        question: '動画のお気に入り登録方法は？',
        answer: '各動画の詳細ページにある「お気に入り」ボタンをクリックすると、マイページの「お気に入り動画」リストに追加されます。'
      },
      {
        question: '視聴履歴はどこで確認できますか？',
        answer: 'マイページの「視聴履歴」タブで、過去に視聴した動画の履歴を確認できます。必要に応じて履歴の削除も可能です。'
      },
      {
        question: 'ジャンル検索はどのように使用しますか？',
        answer: 'トップページのジャンルアイコンをクリックするか、検索結果のフィルターでジャンルを選択することで、特定のジャンルの動画だけを表示できます。'
      }
    ],
    reviews: [
      {
        question: '動画の評価やレビューはどのように投稿できますか？',
        answer: '動画詳細ページで「レビューを書く」ボタンをクリックすると、星評価（1〜5）とコメントを投稿できます。投稿にはログインが必要です。'
      },
      {
        question: '不適切なレビューを報告するには？',
        answer: '各レビューの右下にある「報告」リンクをクリックすると、不適切なコンテンツを報告できます。管理者が確認し、適切な対応を行います。'
      },
      {
        question: '自分が投稿したレビューを編集や削除できますか？',
        answer: 'はい、自分が投稿したレビューは編集や削除が可能です。レビュー下部の「編集」や「削除」ボタンを使用してください。'
      },
      {
        question: 'レビューに返信することはできますか？',
        answer: 'はい、各レビューには返信機能があります。レビュー下部の「返信」ボタンをクリックすると返信フォームが表示されます。'
      }
    ],
    premium: [
      {
        question: 'プレミアム会員の特典は何ですか？',
        answer: 'プレミアム会員は、マッチング機能の完全版、広告表示の削減、特別なバッジ表示、詳細な動画レコメンデーションなどの特典が利用できます。'
      },
      {
        question: 'プレミアム会員の登録方法は？',
        answer: 'マイページの「プレミアムへアップグレード」ボタンをクリックし、料金プランを選択してお支払い情報を入力すると登録できます。'
      },
      {
        question: 'プレミアム会員はいつでもキャンセルできますか？',
        answer: 'はい、いつでもキャンセル可能です。マイページの「サブスクリプション管理」から解約手続きができます。次の請求サイクルまではプレミアム特典を引き続き利用できます。'
      },
      {
        question: '支払い方法はどのようなものがありますか？',
        answer: 'クレジットカード（Visa、Mastercard、American Express）、PayPal、Apple Pay、Google Payに対応しています。'
      }
    ],
    youtuber: [
      {
        question: 'YouTuberとして登録するには？',
        answer: 'マイページで「YouTuber登録」を選択し、YouTubeチャンネルの認証と必要情報の入力を行うことで登録できます。認証後、広告掲載などの特別な機能が利用可能になります。'
      },
      {
        question: '自分の動画を有料掲載枠に掲載するには？',
        answer: 'YouTuberダッシュボードから「新規掲載」を選択し、掲載したい動画、掲載期間、予算などを設定してください。支払い完了後、審査を経て掲載されます。'
      },
      {
        question: '広告効果分析レポートはどこで確認できますか？',
        answer: 'YouTuberダッシュボードの「分析」タブで、インプレッション数、クリック数、CTR（クリック率）などの詳細な分析データを確認できます。'
      },
      {
        question: '掲載料金はどのように決まりますか？',
        answer: '掲載料金は、掲載位置（トップページ、検索結果上部など）、掲載期間、ターゲティングオプションによって異なります。詳細は「広告プラン」ページでご確認いただけます。'
      }
    ],
    matching: [
      {
        question: 'マッチング機能とは何ですか？',
        answer: 'マッチング機能は、同じような興味や視聴傾向を持つユーザー同士をつなげる機能です。共通の興味を持つ友達を見つけたり、動画について議論したりするのに役立ちます。'
      },
      {
        question: 'マッチングの設定はどこで変更できますか？',
        answer: 'マイページの「マッチング設定」タブで、マッチングの優先条件（ジャンル、年齢層、地域など）をカスタマイズできます。'
      },
      {
        question: 'マッチングを受け取らないようにするには？',
        answer: 'マッチング設定で「マッチングを無効化」オプションを選択するか、個別のユーザーをブロックすることができます。'
      },
      {
        question: 'マッチングしたユーザーとはどのようにコミュニケーションができますか？',
        answer: 'マッチング後は、内部メッセージシステムを使ってプライベートメッセージを送ることができます。プレミアム会員は追加の通信機能が利用可能です。'
      }
    ]
  };
  
  const [openQuestions, setOpenQuestions] = useState<OpenQuestions>({});
  
  const toggleQuestion = (index: number) => {
    setOpenQuestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          よくある質問
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          MyTubeNaviに関するよくある質問と回答
        </p>
      </div>
      
      <div className="mb-8 overflow-x-auto">
        <div className="inline-flex rounded-md shadow-sm">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 text-sm font-medium ${
                activeCategory === category.id
                  ? 'bg-primary-600 text-white dark:bg-primary-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-dark-surface dark:text-gray-200 dark:hover:bg-dark-bg'
              } border border-gray-200 dark:border-dark-border first:rounded-l-md last:rounded-r-md focus:z-10 focus:outline-none`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-dark-border">
          <div className="divide-y divide-gray-200 dark:divide-dark-border">
            {faqs[activeCategory].map((faq, index) => (
              <div key={index} className="p-6">
                <button
                  onClick={() => toggleQuestion(index)}
                  className="flex justify-between items-center w-full text-left"
                >
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {faq.question}
                  </h3>
                  <span className="ml-4 flex-shrink-0">
                    <svg
                      className={`h-5 w-5 text-gray-500 dark:text-gray-400 transform ${openQuestions[index] ? 'rotate-180' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>
                <div className={`mt-4 ${openQuestions[index] ? 'block' : 'hidden'}`}>
                  <p className="text-gray-600 dark:text-gray-300">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-12 bg-gray-50 dark:bg-dark-surface/50 rounded-lg p-8 border border-gray-200 dark:border-dark-border text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            お探しの回答が見つかりませんでしたか？
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            その他のご質問やお問い合わせは、サポートチームにお気軽にご連絡ください。
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600"
          >
            お問い合わせ
          </Link>
        </div>
      </div>
    </div>
  );
}