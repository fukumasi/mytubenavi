// src/components/home/GenreList.tsx
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Genre } from '@/types';
import {
    Music,
    GamepadIcon,
    Video,
    GraduationCap,
    Code,
    Utensils,
    Dumbbell,
    Newspaper,
    Cat,
    LayoutList,
    Palette,
     Monitor,
     ShoppingCart,
    Lightbulb,
    BrainCircuit,
   BarChartBig,
    BookOpenCheck
} from 'lucide-react';


interface GenreListProps {
  onGenreClick?: (genre: Genre) => void;
}

export default function GenreList({ onGenreClick }: GenreListProps) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('genres')
          .select('*')
          .is('parent_id', null)
          .order('order');

        if (error) throw error;
        setGenres(data || []);
      } catch (err) {
        console.error('Error fetching genres:', err);
        setError('ジャンルの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchGenres();
  }, []);

    if (loading) {
        return (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
        );
    }


  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }


  return (
     <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-x-auto scrollbar-hide">
      {genres.map((genre) => (
        <Link
          key={genre.id}
          to={`/genre/${genre.slug}`}
          onClick={() => onGenreClick && onGenreClick(genre)}
            className="flex flex-col items-center gap-1 px-2 py-1 text-sm text-center cursor-pointer hover:bg-gray-100 rounded-lg whitespace-nowrap"
            >
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                style={{backgroundColor : getColorForGenre(genre.name)}}
                >
                   <IconRenderer iconName={genre.name} className="w-6 h-6"/>
             </div>
            
          <span className="text-gray-300">{genre.name}</span>
        </Link>
      ))}
    </div>
  );
}


interface IconRendererProps {
    iconName: string;
    className?: string;
}

const IconRenderer = ({iconName, className}:IconRendererProps) => {
    const icons:Record<string,any> = {
         '音楽': Music,
        'ゲーム': GamepadIcon,
        'エンターテイメント': Video,
        '教育': GraduationCap,
        'テクノロジー': Code,
        'ライフスタイル': Utensils,
        'スポーツ': Dumbbell,
        'ニュース': Newspaper,
          'ペット・動物': Cat,
          'その他': LayoutList,
           'ビジネス': BookOpenCheck,
           '美容': Palette,
            '車': Monitor,
            'コミュニティ': Lightbulb,
            'クリエイティブ': BrainCircuit,
             'フード': Utensils,
            'ライフハック': BarChartBig,
              '情報・知識': BookOpenCheck,
             'キッズ': ShoppingCart,
    }
    const getIconForGenre = (genreName:string):any => {
     return icons[genreName] || null;
     };
    const Icon = getIconForGenre(iconName);
    return Icon ? <Icon className={className}/> : null
}



const getColorForGenre = (genreName:string):string => {
    const colors:Record<string,string> = {
        '音楽': '#a8077a', // ピンク
        'ゲーム': '#3f69f7', // ブルー
        'エンターテイメント': '#6a389c', // 紫
        '教育': '#1e8c3f', // 緑
        'テクノロジー': '#32428f', // 濃い青
        'ライフスタイル': '#dab303', // ゴールド
        'スポーツ': '#e81e07', // 赤
         'ニュース': '#74797a',  // グレー
        'ペット・動物': '#8B4513',   // 茶色
         'その他': '#008080', // ティール
        'ビジネス': '#000080', // 濃い青
        '美容': '#FF69B4', // ホットピンク
       '車': '#A9A9A9',   // ダークグレー
        'コミュニティ': '#00CED1', // ダークターコイズ
         'クリエイティブ': '#DAA520', // ゴールデンロッド
        'フード': '#00FF7F', // スプリンググリーン
         'ライフハック': '#9400D3', // ダークバイオレット
         '情報・知識': '#800080',// 紫
         'キッズ': '#FFA500', // オレンジ
      }
   return colors[genreName] || 'gray';
}