// src/components/genre/GenreSidebar.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Genre } from '@/types';

interface GenreSidebarProps {
   activeGenre?: string;
   onSubGenreClick?: (subGenreSlug: string) => void;
   parentGenreId?: string;
}

interface GenreWithSubGenres extends Genre {
   subGenres?: GenreWithSubGenres[];
}

export default function GenreSidebar({ activeGenre, onSubGenreClick, parentGenreId }: GenreSidebarProps) {
   const [genres, setGenres] = useState<GenreWithSubGenres[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
       const fetchGenreHierarchy = async () => {
           try {
               setLoading(true);
               setError(null);

               if (!parentGenreId) {
                   setGenres([]);
                   return;
               }

               const { data: subGenres, error: subGenresError } = await supabase
                   .from('genres')
                   .select('*')
                   .eq('parent_genre_id', parentGenreId)
                   .order('order');

               if (subGenresError) {
                   throw subGenresError;
               }

               setGenres(subGenres || []);
           } catch (err) {
               console.error('Error fetching genres:', err);
               setError('ジャンルの読み込みに失敗しました');
           } finally {
               setLoading(false);
           }
       };

       fetchGenreHierarchy();
   }, [parentGenreId]);

   const handleGenreClick = (slug: string) => {
       if (onSubGenreClick) {
           onSubGenreClick(slug);
       }
   };

   if (loading) {
       return <div className="animate-pulse h-full w-full bg-gray-200"></div>;
   }

   if (error) {
       return <div className="text-red-500 p-4">{error}</div>;
   }

   if (genres.length === 0) {
       return <div className="p-4 text-gray-500">サブジャンルがありません</div>;
   }

   return (
       <div className="bg-gray-50 rounded-lg p-4">
           <h2 className="text-lg font-semibold mb-4">サブジャンル</h2>
           <div className="space-y-2">
               {genres.map(genre => (
                   <div
                       key={genre.id}
                       className={`flex items-center py-2 px-4 rounded-md cursor-pointer transition-colors
                           ${activeGenre === genre.slug ? 'bg-primary-600 text-white' : 'hover:bg-gray-100'}`}
                       onClick={() => handleGenreClick(genre.slug)}
                   >
                       <span className="flex items-center">
                           {genre.icon && <span className="mr-2">{genre.icon}</span>}
                           {genre.name}
                       </span>
                   </div>
               ))}
           </div>
       </div>
   );
}