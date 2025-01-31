
import { Filter } from 'lucide-react';

const genres = [
  { id: 'all', name: 'すべて' },
  { id: 'music', name: '音楽' },
  { id: 'gaming', name: 'ゲーム' },
  { id: 'education', name: '教育' },
  { id: 'entertainment', name: 'エンターテイメント' },
  { id: 'tech', name: 'テクノロジー' },
  { id: 'lifestyle', name: 'ライフスタイル' },
  { id: 'vlog', name: 'ブログ' }
];

const sortOptions = [
  { id: 'relevance', name: '関連度順' },
  { id: 'date', name: '新着順' },
  { id: 'rating', name: '評価順' },
  { id: 'views', name: '視聴回数順' }
];

interface SearchFiltersProps {
  selectedGenre: string;
  selectedSort: string;
  onGenreChange: (genre: string) => void;
  onSortChange: (sort: string) => void;
}

export default function SearchFilters({
  selectedGenre,
  selectedSort,
  onGenreChange,
  onSortChange
}: SearchFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center mb-4">
        <Filter className="h-5 w-5 text-gray-400 mr-2" />
        <h2 className="text-sm font-medium text-gray-900">検索フィルター</h2>
      </div>

      <div className="space-y-4">
        {/* ジャンルフィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ジャンル
          </label>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => onGenreChange(genre.id === 'all' ? '' : genre.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  (genre.id === 'all' && !selectedGenre) || genre.id === selectedGenre
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>

        {/* 並び替え */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            並び替え
          </label>
          <select
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
      </div>
    </div>
  );
}