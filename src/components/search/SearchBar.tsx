// src/components/search/SearchBar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch?: () => void;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, className = '' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // フォーカス時の動作
  const handleFocus = () => {
    setIsFocused(true);
  };

  // フォーカスを失った時の動作
  const handleBlur = () => {
    // すぐに状態を更新すると、クリックイベントが発火する前に状態が更新されてしまうため、
    // 少し遅延を設ける
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  };

  // 検索クエリをクリア
  const clearSearch = () => {
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      
      // 検索実行後の処理
      if (onSearch) {
        onSearch();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <form onSubmit={handleSearch} className={`relative flex-1 ${className}`}>
      <div className={`flex items-center w-full bg-white rounded-lg overflow-hidden transition-all duration-200 border ${isFocused ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
        <div className="pl-3 text-gray-400">
          <Search className="h-5 w-5" />
        </div>
        
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="block w-full pl-2 pr-3 py-2 bg-transparent outline-none placeholder-gray-500 text-gray-900 sm:text-sm"
          placeholder="動画を検索..."
        />
        
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="検索をクリア"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        <button
          type="submit"
          className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <span className="text-sm font-medium text-white">検索</span>
        </button>
      </div>
    </form>
  );
};

export default SearchBar;