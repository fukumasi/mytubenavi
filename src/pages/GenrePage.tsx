// src/pages/GenrePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Genre } from '@/types';
import GenreList from '@/components/home/GenreList';

const GenrePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [subGenres, setSubGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubGenres = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('genres')
          .select('*')
          .eq('parent_slug', slug)
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
  }, [slug]);

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">サブジャンル</h1>
      {subGenres.length > 0 ? (
        <GenreList />
      ) : (
        <p className="text-gray-500">サブジャンルが見つかりませんでした。</p>
      )}
    </div>
  );
};

export default GenrePage;