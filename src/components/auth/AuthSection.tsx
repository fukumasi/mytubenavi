import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Youtube } from 'lucide-react';

export function AuthSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">アカウント</h3>
      
      <div className="space-y-3">
        <button 
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="ログイン"
        >
          <LogIn className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
          ログイン
        </button>
        
        <button 
          onClick={() => navigate('/signup')}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          aria-label="新規登録"
        >
          <UserPlus className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
          新規登録
        </button>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">または</span>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/youtuber/register')}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          aria-label="YouTuberとして登録"
        >
          <Youtube className="inline-block w-4 h-4 mr-2 text-red-600" aria-hidden="true" />
          YouTuberとして登録
        </button>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>
          登録することで、
          <a 
            href="/terms-of-service" 
            className="text-indigo-600 hover:text-indigo-500 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            利用規約
          </a>
          と
          <a 
            href="/privacy-policy" 
            className="text-indigo-600 hover:text-indigo-500 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            プライバシーポリシー
          </a>
          に同意したことになります。
        </p>
      </div>
    </div>
  );
}

export default AuthSection;