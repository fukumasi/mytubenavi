// src/components/genre/GenreSidebar.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Genre } from '@/types';
import { Link } from 'react-router-dom';

interface GenreSidebarProps {
   parentGenre?: string;
   activeGenre?: string;
   onSubGenreClick?: (subGenreSlug: string) => void;
}

export default function GenreSidebar({ parentGenre, activeGenre, onSubGenreClick }: GenreSidebarProps) {
   const [subGenres, setSubGenres] = useState<Genre[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
       const fetchSubGenres = async () => {
           if (!parentGenre) return;
           try {
               setLoading(true);
               const { data: genreData, error: genreError } = await supabase
                   .from('genres')
                   .select('id')
                   .eq('slug', parentGenre)
                   .single();

               if (genreError || !genreData) {
                   setError('ジャンルの取得に失敗しました');
                   return;
               }

               const { data, error } = await supabase
                   .from('genres')
                   .select('*')
                   .eq('parent_genre_id', genreData.id)
                   .order('order');

               if (error) throw error;
               setSubGenres(data || []);
           } catch (err) {
               console.error('Error fetching sub-genres:', err);
               setError('サブジャンルの読み込みに失敗しました');
           } finally {
               setLoading(false);
           }
       };
       fetchSubGenres();
   }, [parentGenre]);
   
   const handleSubGenreClick = (slug: string) => {
       if(onSubGenreClick){
           onSubGenreClick(slug)
       }
   }

   if (loading) {
       return <div className="animate-pulse h-full w-full bg-gray-200"></div>;
   }

   if (error) {
       return <div className="text-red-500 p-4">{error}</div>;
   }

   return (
       <div className="bg-gray-50 rounded-lg p-4">
           <h2 className="text-lg font-semibold mb-4">サブジャンル</h2>
           <div className="space-y-2">
               {subGenres.map((subGenre) => (
                   <Link
                       key={subGenre.id}
                       to={`/genre/${parentGenre}/${subGenre.slug}`}
                       onClick={() => handleSubGenreClick(subGenre.slug)}
                       className={`block px-4 py-2 rounded-md transition-colors cursor-pointer ${
                           activeGenre === subGenre.slug
                               ? 'bg-primary-600 text-white'
                               : 'hover:bg-gray-100'
                       }`}
                   >
                       <span className="flex items-center">
                           {subGenre.icon && (
                               <span className="mr-2">
                                   {subGenre.icon}
                               </span>
                           )}
                           {subGenre.name}
                       </span>
                   </Link>
               ))}
           </div>
       </div>
   );
}