import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface SubGenre {
  id: string;
  name: string;
  slug: string;
}

interface GenreSidebarProps {
  parentGenre: string;
  subGenres: SubGenre[];
  activeGenre?: string;
}

export default function GenreSidebar({ parentGenre, subGenres, activeGenre }: GenreSidebarProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {parentGenre === 'music' && '音楽'}
        {parentGenre === 'gaming' && 'ゲーム'}
        {parentGenre === 'entertainment' && 'エンタメ'}
        {parentGenre === 'education' && '教育'}
        {parentGenre === 'technology' && 'テクノロジー'}
        {parentGenre === 'lifestyle' && 'ライフスタイル'}
        {parentGenre === 'sports' && 'スポーツ'}
        {parentGenre === 'news' && 'ニュース'}
      </h3>
      
      <div className="space-y-1">
        <button
          onClick={() => navigate(`/genre/${parentGenre}`)}
          className={`w-full flex items-center px-4 py-2.5 text-sm rounded-lg transition-colors ${
            !activeGenre
              ? 'bg-gray-50 text-gray-900 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          すべて表示
        </button>

        {subGenres.map((genre) => (
          <button
            key={genre.id}
            onClick={() => navigate(`/genre/${parentGenre}/${genre.slug}`)}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-colors ${
              activeGenre === genre.slug
                ? 'bg-gray-50 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{genre.name}</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}