import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Genre } from '@/types';
import {
   Video, GraduationCap, Code,
   Utensils, Dumbbell, Newspaper, LayoutList,
   BarChartBig, BookOpenCheck
} from 'lucide-react';

interface GenreListProps {
 onGenreClick?: (genre: Genre) => void;
 genres?: Genre[];
 parentGenre?: string;
}

interface IconRendererProps {
 iconName: string;
 className?: string;
}

const IconRenderer = ({iconName, className}: IconRendererProps) => {
 const icons: Record<string, any> = {
   'エンターテイメント': Video,
   '情報・知識': BookOpenCheck,
   'ライフスタイル': Utensils,
   'スポーツ': Dumbbell,
   'ニュース': Newspaper,
   '教育': GraduationCap,
   'テクノロジー': Code,
   'フード': Utensils,
   'ビジネス': BookOpenCheck,
   'ライフハック': BarChartBig,
   'その他': LayoutList
 };
 const Icon = icons[iconName];
 return Icon ? <Icon className={className}/> : null;
};

const getColorForGenre = (genreName: string): string => {
 const colors: Record<string, string> = {
   'エンターテイメント': '#6a389c',
   '情報・知識': '#800080',
   'ライフスタイル': '#dab303',
   'スポーツ': '#e81e07',
   'ニュース': '#74797a',
   '教育': '#1e8c3f',
   'テクノロジー': '#32428f',
   'フード': '#00FF7F',
   'ビジネス': '#000080',
   'ライフハック': '#9400D3',
   'その他': '#008080'
 };
 return colors[genreName] || 'gray';
};

function GenreList({ onGenreClick, genres: propGenres }: GenreListProps) {
 const [genres, setGenres] = useState<Genre[]>(propGenres || []);
 const [loading, setLoading] = useState(!propGenres);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
   if (propGenres) return;

   const fetchGenres = async () => {
     try {
       setLoading(true);
       const { data, error } = await supabase
         .from('genres')
         .select('*')
         .is('parent_genre_id', null)
         .order('order', { ascending: true });

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
 }, [propGenres]);

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
     {genres
       .filter(genre => IconRenderer({iconName: genre.name, className: ''}) !== null)
       .map((genre) => (
         <Link
           key={genre.id}
           to={`/genre/${genre.slug}`}
           onClick={() => onGenreClick && onGenreClick(genre)}
           className="flex flex-col items-center gap-1 px-2 py-1 text-sm text-center cursor-pointer hover:bg-gray-100 rounded-lg whitespace-nowrap"
         >
           <div
             className="w-10 h-10 rounded-full flex items-center justify-center text-white"
             style={{backgroundColor: getColorForGenre(genre.name)}}
           >
             <IconRenderer iconName={genre.name} className="w-6 h-6"/>
           </div>
           <span className="text-indigo-600">{genre.name}</span>
         </Link>
     ))}
   </div>
 );
}

export default GenreList;