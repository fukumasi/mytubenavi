// src/components/search/SearchBar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  className?: string;
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSearchComplete?: () => void;
  clearSearchBox?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  className = '', 
  initialQuery,
  placeholder = '動画を検索...',
  autoFocus = false,
  onSearchComplete,
  clearSearchBox = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(initialQuery || searchParams.get('q') || '');
  const [isFocused, setIsFocused] = useState(autoFocus);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 検索ページにいるかどうかを判断
  const isSearchPage = location.pathname === '/search';
  
  // コンポーネントがマウントされたか追跡
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // URLのクエリパラメータが変更されたら内部のstateも更新
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery !== null && urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams, query]);

  // clearSearchBox プロパティが変更された時、検索ボックスをクリア
  useEffect(() => {
    if (clearSearchBox) {
      setQuery('');
    }
  }, [clearSearchBox]);

  // フォーカス時の動作
  const handleFocus = () => {
    setIsFocused(true);
  };

  // フォーカスを失った時の動作
  const handleBlur = () => {
    // すぐに状態を更新すると、クリックイベントが発火する前に状態が更新されてしまうため、
    // 少し遅延を設ける
    setTimeout(() => {
      if (isMounted.current) {
        setIsFocused(false);
      }
    }, 200);
  };

  // 検索クエリをクリア
  const clearSearch = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setQuery('');
    
    // 検索ページにいる場合は、クエリパラメータなしの検索ページに遷移
    if (isSearchPage) {
      navigate('/search');
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      
      // 検索実行後の処理
      if (onSearch) {
        onSearch(trimmedQuery);
      }
      
      // 検索完了後の処理
      if (onSearchComplete) {
        onSearchComplete();
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
    } else if (e.key === 'Escape') {
      // Escキーを押したときに検索クエリをクリア
      setQuery('');
      
      // 検索ページにいる場合は、クエリパラメータなしの検索ページに遷移
      if (isSearchPage) {
        navigate('/search');
      }
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
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="block w-full pl-2 pr-3 py-2 bg-transparent outline-none placeholder-gray-500 text-gray-900 sm:text-sm"
          placeholder={placeholder}
          aria-label="検索"
        />
        
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="検索をクリア"
            tabIndex={-1}
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