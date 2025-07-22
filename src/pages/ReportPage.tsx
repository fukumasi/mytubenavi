import { useState } from 'react';

export default function ReportPage() {
  const [formData, setFormData] = useState({
    type: 'video',
    content_id: '',
    reason: 'inappropriate',
    description: '',
    email: '',
    name: ''
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
    
    try {
      // 報告APIを呼び出すコードをここに追加
      // 例: await api.submitReport(formData);
      
      // 送信成功をシミュレーション
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitSuccess(true);
      setFormData({
        type: 'video',
        content_id: '',
        reason: 'inappropriate',
        description: '',
        email: '',
        name: ''
      });
    } catch (error) {
      console.error('問題報告の送信中にエラーが発生しました:', error);
      setSubmitError('報告の送信に失敗しました。しばらくしてからもう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          問題を報告
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          不適切なコンテンツや技術的な問題を報告する
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">報告を受け付けました</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                ご報告ありがとうございます。内容を確認し、適切に対応いたします。
              </p>
              <button
                onClick={() => setSubmitSuccess(false)}
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600"
              >
                新しい報告
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
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    報告タイプ
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  >
                    <option value="video">動画コンテンツ</option>
                    <option value="review">レビュー/コメント</option>
                    <option value="user">ユーザー行為</option>
                    <option value="technical">技術的な問題</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="content_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    コンテンツID/URL（わかる場合）
                  </label>
                  <input
                    type="text"
                    id="content_id"
                    name="content_id"
                    value={formData.content_id}
                    onChange={handleChange}
                    placeholder="例: 動画ID、レビューID、ユーザー名、またはURL"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    報告理由
                  </label>
                  <select
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  >
                    <option value="inappropriate">不適切なコンテンツ</option>
                    <option value="copyright">著作権侵害</option>
                    <option value="harassment">ハラスメント/いじめ</option>
                    <option value="spam">スパム/誤解を招く内容</option>
                    <option value="violence">暴力/危険な行為</option>
                    <option value="bug">バグ/技術的問題</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    詳細な説明
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="問題の詳細を入力してください。できるだけ具体的に記載いただくとスムーズに対応できます。"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    お名前（任意）
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    メールアドレス（任意、対応結果の連絡に使用）
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:bg-dark-bg text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 dark:focus:ring-offset-dark-surface disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '送信中...' : '報告を送信する'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}