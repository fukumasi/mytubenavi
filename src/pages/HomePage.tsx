// src/pages/HomePage.tsx
import { Suspense, lazy } from 'react';
import { Genre } from '@/types';
import { useNavigate } from 'react-router-dom';
import PremiumPromotion from '../components/home/PremiumPromotion';
import useMediaQuery from '../hooks/useMediaQuery';

const GenreList = lazy(() => import('@/components/home/GenreList'));
const AdsSection = lazy(() => import('@/components/home/AdsSection'));
const FeaturedVideos = lazy(() => import('@/components/home/FeaturedVideos'));
const LatestReviewedVideos = lazy(() => import('@/components/home/LatestReviewedVideos'));
const PromotedVideos = lazy(() => import('@/components/home/PromotedVideos'));

export default function HomePage() {
    const navigate = useNavigate();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const handleGenreClick = (genre: Genre) => {
        navigate(`/genre/${genre.slug}`);
    };

    return (
        <main>
            <div className="container mx-auto px-4">
                {isMobile ? (
                    // モバイル向けレイアウト
                    <div className="space-y-6 py-4">
                        {/* モバイル用バナー/プロモーション */}
                        <div className="w-full">
                            <PremiumPromotion />
                        </div>
                        
                        {/* モバイル用ジャンル縦リスト */}
                        <Suspense fallback={<div>Loading...</div>}>
                            <section>
                                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">ジャンルから探す</h2>
                                <div className="mobile-genre-list">
                                    <GenreList onGenreClick={handleGenreClick} mobileVertical={true} />
                                </div>
                            </section>
                            
                            {/* スポンサード動画 */}
                            <section>
                                <PromotedVideos showIfEmpty={false} title="スポンサード動画" />
                            </section>

                            {/* 注目の動画 - モバイルでは2列表示 */}
                            <section>
                                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">注目の動画</h2>
                                <FeaturedVideos />
                            </section>

                            {/* レビューが多い動画 - モバイルでは2列表示 */}
                            <section>
                                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">レビューが多い動画</h2>
                                <LatestReviewedVideos />
                            </section>
                        </Suspense>
                    </div>
                ) : (
                    // PC向けレイアウト（既存のもの）
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
                                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">ジャンルから探す</h2>
                                    <GenreList onGenreClick={handleGenreClick} />
                                </section>

                                <section>
                                    <PromotedVideos showIfEmpty={false} title="スポンサード動画" />
                                </section>

                                <section>
                                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">注目の動画</h2>
                                    <FeaturedVideos />
                                </section>

                                <section>
                                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">レビューが多い動画</h2>
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
                )}
            </div>
        </main>
    );
}