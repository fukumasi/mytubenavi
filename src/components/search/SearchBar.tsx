import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function SearchBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  // 検索後にクエリをクリアするための効果
  useEffect(() => {
    // ページ遷移後に検索窓の内容をクリア
    const handleRouteChange = () => {
      setQuery('');
    };

    // イベントリスナーを設定
    window.addEventListener('popstate', handleRouteChange);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      // 検索実行後にクエリをクリア
      setQuery('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(e);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative flex-1 max-w-2xl">
      <div className="relative flex">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="search"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-l-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="動画を検索..."
          />
        </div>
        <button
          type="submit"
          className="flex items-center px-6 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <span className="text-sm font-medium text-gray-700">検索</span>
        </button>
      </div>
    </form>
  );
}