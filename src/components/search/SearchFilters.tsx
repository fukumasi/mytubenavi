// src/components/search/SearchFilters.tsx
import React, { useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';

// ジャンルおよびソートオプションの型定義
interface FilterOption {
  id: string;
  name: string;
}

// 日付フィルターのオプション
const dateRangeOptions: FilterOption[] = [
  { id: 'all', name: '期間指定なし' },
  { id: 'today', name: '今日' },
  { id: 'week', name: '今週' },
  { id: 'month', name: '今月' },
  { id: 'year', name: '今年' }
];

// ジャンルのオプション
const genres: FilterOption[] = [
  { id: 'all', name: 'すべて' },
  { id: 'music', name: '音楽' },
  { id: 'gaming', name: 'ゲーム' },
  { id: 'education', name: '教育' },
  { id: 'entertainment', name: 'エンターテイメント' },
  { id: 'tech', name: 'テクノロジー' },
  { id: 'lifestyle', name: 'ライフスタイル' },
  { id: 'vlog', name: 'ブログ' }
];

// 並び替えのオプション
const sortOptions: FilterOption[] = [
  { id: 'relevance', name: '関連度順' },
  { id: 'date', name: '新着順' },
  { id: 'rating', name: '評価順' },
  { id: 'views', name: '視聴回数順' },
  { id: 'comments', name: 'コメント数順' }
];

// 動画の長さフィルターのオプション
const durationOptions: FilterOption[] = [
  { id: 'all', name: '長さ指定なし' },
  { id: 'short', name: '4分未満' },
  { id: 'medium', name: '4〜20分' },
  { id: 'long', name: '20分以上' }
];

export interface SearchFiltersProps {
  selectedGenre: string;
  selectedSort: string;
  selectedDateRange?: string;
  selectedDuration?: string;
  onGenreChange: (genre: string) => void;
  onSortChange: (sort: string) => void;
  onDateRangeChange?: (dateRange: string) => void;
  onDurationChange?: (duration: string) => void;
  className?: string;
  showAdvancedFilters?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  selectedGenre,
  selectedSort,
  selectedDateRange = 'all',
  selectedDuration = 'all',
  onGenreChange,
  onSortChange,
  onDateRangeChange,
  onDurationChange,
  className = '',
  showAdvancedFilters: initialShowAdvanced = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(initialShowAdvanced);

  const toggleAdvancedFilters = () => {
    setShowAdvanced(prev => !prev);
  };

  const handleGenreChange = (genreId: string) => {
    onGenreChange(genreId === 'all' ? '' : genreId);
  };

  const handleDateRangeChange = (dateRange: string) => {
    if (onDateRangeChange) {
      onDateRangeChange(dateRange === 'all' ? '' : dateRange);
    }
  };

  const handleDurationChange = (duration: string) => {
    if (onDurationChange) {
      onDurationChange(duration === 'all' ? '' : duration);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-sm font-medium text-gray-900">検索フィルター</h2>
        </div>
        <button
          onClick={toggleAdvancedFilters}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          aria-expanded={showAdvanced}
          aria-controls="advanced-filters"
        >
          {showAdvanced ? (
            <>
              <span>簡易表示</span>
              <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              <span>詳細設定</span>
              <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {/* ジャンルフィルター */}
        <div>
          <label htmlFor="genre-filter" className="block text-sm font-medium text-gray-700 mb-2">
            ジャンル
          </label>
          <div className="flex flex-wrap gap-2" id="genre-filter" role="radiogroup">
            {genres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => handleGenreChange(genre.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  (genre.id === 'all' && !selectedGenre) || genre.id === selectedGenre
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                role="radio"
                aria-checked={(genre.id === 'all' && !selectedGenre) || genre.id === selectedGenre}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>

        {/* 並び替え */}
        <div>
          <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 mb-2">
            並び替え
          </label>
          <select
            id="sort-select"
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* 詳細フィルター（トグル可能） */}
        {showAdvanced && (
          <div id="advanced-filters" className="pt-2">
            {/* 期間フィルター */}
            <div className="mb-4">
              <label htmlFor="date-range-filter" className="block text-sm font-medium text-gray-700 mb-2">
                期間
              </label>
              <div className="flex flex-wrap gap-2" id="date-range-filter" role="radiogroup">
                {dateRangeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleDateRangeChange(option.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (option.id === 'all' && !selectedDateRange) || option.id === selectedDateRange
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    role="radio"
                    aria-checked={(option.id === 'all' && !selectedDateRange) || option.id === selectedDateRange}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 動画の長さフィルター */}
            <div>
              <label htmlFor="duration-filter" className="block text-sm font-medium text-gray-700 mb-2">
                動画の長さ
              </label>
              <div className="flex flex-wrap gap-2" id="duration-filter" role="radiogroup">
                {durationOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleDurationChange(option.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (option.id === 'all' && !selectedDuration) || option.id === selectedDuration
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    role="radio"
                    aria-checked={(option.id === 'all' && !selectedDuration) || option.id === selectedDuration}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;