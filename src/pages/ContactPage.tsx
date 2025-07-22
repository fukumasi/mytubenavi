import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    // 実際には、ここでAPIを呼び出してお問い合わせを送信
    try {
      // お問い合わせのAPIを呼び出すコードをここに追加
      // 例: await api.submitContactForm(formData);

      // 送信成功をシミュレーション
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
      });
    } catch (error) {
      console.error('お問い合わせの送信中にエラーが発生しました:', error);
      setSubmitError('お問い合わせの送信に失敗しました。しばらくしてからもう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          お問い合わせ
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          ご質問、ご要望、フィードバックをお寄せください
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-dark-border p-8">
          {submitSuccess ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">お問い合わせを受け付けました</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                ご連絡ありがとうございます。内容を確認し、必要に応じて返信いたします。
              </p>
              <button
                onClick={() => setSubmitSuccess(false)}
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600"
              >
                新しいお問い合わせ
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {submitError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    お問い合わせ種類
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  >
                    <option value="general">一般的なお問い合わせ</option>
                    <option value="account">アカウントについて</option>
                    <option value="technical">技術的な問題</option>
                    <option value="billing">お支払いについて</option>
                    <option value="feedback">フィードバック</option>
                    <option value="youtuber">YouTuber向けサービスについて</option>
                    <option value="other">その他</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    お名前
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    件名
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    お問い合わせ内容
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 dark:focus:ring-offset-dark-surface disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '送信中...' : '送信する'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="mt-12 bg-gray-50 dark:bg-dark-surface/50 rounded-lg p-8 border border-gray-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            その他のお問い合わせ方法
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                よくある質問
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                お問い合わせの前に、よくある質問をご確認ください。
              </p>
              {/* ここに <a を追加 */}
              <a
                href="/faq"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                FAQを見る →
              </a>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                ヘルプセンター
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                より詳細なガイドと情報はヘルプセンターをご覧ください。
              </p>
              {/* ここに <a を追加 */}
              <a
                href="/help"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                ヘルプセンターへ →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}