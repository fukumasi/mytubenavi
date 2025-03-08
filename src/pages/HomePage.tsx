import { Suspense, lazy } from 'react';
import { Genre } from '@/types';
import { useNavigate } from 'react-router-dom';
import PremiumPromotion from '../components/home/PremiumPromotion';

const GenreList = lazy(() => import('@/components/home/GenreList'));
const AdsSection = lazy(() => import('@/components/home/AdsSection'));
const FeaturedVideos = lazy(() => import('@/components/home/FeaturedVideos'));
const LatestReviewedVideos = lazy(() => import('@/components/home/LatestReviewedVideos'));

export default function HomePage() {
    const navigate = useNavigate();

    const handleGenreClick = (genre: Genre) => {
        navigate(`/genre/${genre.slug}`);
    };

    return (
        <main>
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <aside className="lg:col-span-2 hidden lg:block">
                        <div className="sticky top-24 space-y-6">
                            {/* プレミアム会員プロモーション - 左カラムに配置、top-24でヘッダー下に配置 */}
                            <PremiumPromotion />
                            {/*  ソート機能などを追加する場合はここに記述 */}
                        </div>
                    </aside>

                    <main className="lg:col-span-8 space-y-8 py-8">
                        <Suspense fallback={<div>Loading...</div>}>
                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900">ジャンルから探す</h2>
                                <GenreList onGenreClick={handleGenreClick} />
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900">注目の動画</h2>
                                <FeaturedVideos />
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900">レビューが多い動画</h2>
                                <LatestReviewedVideos />
                            </section>
                        </Suspense>
                    </main>

                    <aside className="lg:col-span-2 hidden lg:block">
                        <div className="sticky top-24">
                            {/* 広告も同様にtop-24でヘッダー下に配置 */}
                            <AdsSection />
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}