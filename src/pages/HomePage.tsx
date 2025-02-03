// src/pages/HomePage.tsx

import LatestCommentVideos from '@/components/home/LatestCommentVideos';
import GenreList from '@/components/home/GenreList';
import { Genre } from '@/types';
import { useNavigate } from 'react-router-dom';
import AdsSection from '@/components/home/AdsSection';
import FeaturedVideos from '@/components/home/FeaturedVideos';

export default function HomePage() {
    const navigate = useNavigate();

    const handleGenreClick = (genre: Genre) => {
        navigate(`/genre/${genre.slug}`);
    };

    return (
        <main>
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* 左カラム */}
                    <aside className="lg:col-span-2 hidden lg:block">
                        <div className="sticky top-4">
                            {/*  ソート機能などを追加する場合はここに記述 */}
                        </div>
                    </aside>

                    {/* メインコンテンツ */}
                    <main className="lg:col-span-8 space-y-8 py-8">
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-gray-900">ジャンルから探す</h2>
                            <GenreList onGenreClick={handleGenreClick} />
                        </section>
                       <section className="mb-8">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900">注目の動画</h2>
                                 <FeaturedVideos />
                        </section>
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-gray-900">コメントが多い動画</h2>
                            <LatestCommentVideos />
                        </section>
                    </main>

                    {/* 右カラム */}
                    <aside className="lg:col-span-2 hidden lg:block">
                        <div className="sticky top-4">
                            <AdsSection />
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}