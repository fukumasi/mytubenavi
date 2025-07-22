// src/components/layout/Footer.tsx
import { Link } from 'react-router-dom';

/** フッターの表示リンクをまとめたデータ */
const footerSections: {
  title: string;
  links: { label: string; to: string }[];
}[] = [
  {
    title: 'サイト情報',
    links: [
      { label: 'About', to: '/about' },
      { label: 'ガイドライン', to: '/guidelines' },
      { label: 'プライバシー', to: '/privacy' },
    ],
  },
  {
    title: 'ヘルプ',
    links: [
      { label: 'FAQ', to: '/faq' },
      { label: 'お問い合わせ', to: '/contact' },
      { label: 'レポート', to: '/report' },
    ],
  },
  {
    title: 'プレミアム',
    links: [
      { label: '機能', to: '/premium/features' },
      { label: 'アップグレード', to: '/premium/upgrade' },
      { label: '料金プラン', to: '/plans' },
    ],
  },
  {
    title: 'SNS',
    links: [
      { label: 'Twitter', to: 'https://twitter.com/your_account' },
      { label: 'Instagram', to: 'https://instagram.com/your_account' },
      { label: 'YouTube', to: 'https://www.youtube.com/your_channel' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-dark-surface py-10">
      <div className="container mx-auto px-4">
        {/* ---- 各セクション ---- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold mb-4 text-gray-700 dark:text-dark-text-primary">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((item) => (
                  <li key={item.label}>
                    {/* 外部リンクは target="_blank" を付ける */}
                    {item.to.startsWith('http') ? (
                      <a
                        href={item.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 dark:text-dark-text-secondary hover:underline"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        to={item.to}
                        className="text-gray-600 dark:text-dark-text-secondary hover:underline"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ---- コピーライト ---- */}
        <p className="mt-8 text-center text-xs text-gray-500 dark:text-dark-text-secondary">
          © {new Date().getFullYear()} MyTubeNavi
        </p>
      </div>
    </footer>
  );
}
