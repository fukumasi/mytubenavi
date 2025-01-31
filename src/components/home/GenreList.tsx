// src/components/home/GenreList.tsx

import { useNavigate } from 'react-router-dom';
import {
  Music,
  GamepadIcon,
  Video,
  GraduationCap,
  Code,
  Utensils,
  Dumbbell,
  Newspaper
} from 'lucide-react';

const genres = [
  { id: 1, name: '音楽', slug: 'music', icon: Music, color: 'bg-pink-400' },
  { id: 2, name: 'ゲーム', slug: 'gaming', icon: GamepadIcon, color: 'bg-blue-500' },
  { id: 3, name: 'エンタメ', slug: 'entertainment', icon: Video, color: 'bg-purple-500' },
  { id: 4, name: '教育', slug: 'education', icon: GraduationCap, color: 'bg-green-500' },
  { id: 5, name: 'テクノロジー', slug: 'technology', icon: Code, color: 'bg-indigo-500' },
  { id: 6, name: 'ライフスタイル', slug: 'lifestyle', icon: Utensils, color: 'bg-yellow-500' },
  { id: 7, name: 'スポーツ', slug: 'sports', icon: Dumbbell, color: 'bg-red-500' },
  { id: 8, name: 'ニュース', slug: 'news', icon: Newspaper, color: 'bg-gray-500' }
];

export default function GenreList() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {genres.map((genre) => (
        <button
          key={genre.id}
          onClick={() => navigate(`/genre/${genre.slug}`)}
          className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-gray-50 transition-all duration-200"
        >
          <div className={`p-3 rounded-full ${genre.color} text-white mb-2`}>
            <genre.icon className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-gray-900 text-center">
            {genre.name}
          </span>
        </button>
      ))}
    </div>
  );
}