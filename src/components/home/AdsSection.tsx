// src/components/home/AdsSection.tsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AdsSection.css';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface PromotionSlot {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoId: string;
  channelName: string;
  viewCount: number;
  position: 'home_top' | 'home_side' | 'genre_top' | 'search_top';
  startDate: string;
  endDate: string;
  status: 'active' | 'pending' | 'expired';
}

export default function AdsSection() {
  const [promotionSlots, setPromotionSlots] = useState<PromotionSlot[]>([]);
  const [isYoutuber, setIsYoutuber] = useState(false);
  const { user } = useAuth();

  // ユーザーがYouTuberかどうかを確認
  useEffect(() => {
    const checkYoutuberStatus = async () => {
      if (!user) {
        setIsYoutuber(false);
        return;
      }
    
      try {
        // まず単純なクエリでテスト
        console.log('テスト1: 単純なGETクエリ');
        const { data: testData, error: testError } = await supabase
          .from('youtuber_profiles')
          .select('*')
          .limit(1);
        
        console.log('テスト1結果:', { testData, testError });
        
        // 次に対象の条件クエリをテスト
        console.log('テスト2: 条件付きクエリ');
        const { data, error } = await supabase
          .from('youtuber_profiles')
          .select('id')
          .eq('id', user.id)
          .single();
        
        console.log('テスト2結果:', { data, error });
        
        setIsYoutuber(!!data);
      } catch (error) {
        console.error('Error checking youtuber status:', error);
        setIsYoutuber(false);
      }
    };

    checkYoutuberStatus();
  }, [user]);

  // 有料掲載枠データを取得
  useEffect(() => {
    const fetchPromotionSlots = async () => {
      try {
        // TODO: 実際のAPIと接続する際にはこのモックデータを置き換え
        const mockData: PromotionSlot[] = [
          {
            id: "promo-1",
            title: '【最新】話題の新製品レビュー！使ってみた感想と評価',
            thumbnailUrl: '/placeholder.jpg',
            videoId: 'abc123',
            channelName: 'テックレビューチャンネル',
            viewCount: 102453,
            position: 'home_top',
            startDate: '2025-01-01',
            endDate: '2025-03-01',
            status: 'active'
          },
          {
            id: "promo-2",
            title: '初心者でも簡単！人気料理の作り方【保存版】',
            thumbnailUrl: '/placeholder.jpg',
            videoId: 'def456',
            channelName: '毎日クッキング',
            viewCount: 85210,
            position: 'home_top',
            startDate: '2025-01-15',
            endDate: '2025-02-15',
            status: 'active'
          },
          {
            id: "promo-3",
            title: '【必見】今年流行りのファッションアイテム総まとめ',
            thumbnailUrl: '/placeholder.jpg',
            videoId: 'ghi789',
            channelName: 'トレンドスタイル',
            viewCount: 67890,
            position: 'home_side',
            startDate: '2025-01-10',
            endDate: '2025-02-10',
            status: 'active'
          }
        ];
        
        // ホーム用のトップ掲載枠を取得
        const activeSlots = mockData.filter(slot => 
          slot.status === 'active' && 
          (slot.position === 'home_top' || slot.position === 'home_side') &&
          new Date(slot.endDate) >= new Date()
        );
        
        setPromotionSlots(activeSlots);
      } catch (error) {
        console.error('Error fetching promotion slots:', error);
      }
    };

    fetchPromotionSlots();
  }, []);

  // 数値を読みやすい形式に変換（例: 102453 → 10.2万）
  const formatViewCount = (count: number): string => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万回視聴`;
    }
    return `${count.toLocaleString()}回視聴`;
  };

  // 広告枠表示用スタイル
  const adFrameStyle = {
    width: '100%',
    height: '150px',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '14px',
    color: '#777',
    borderRadius: '0.375rem',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px 0 rgba(0,0,0,.06)',
  };

  const mobileAdFrameStyle = {
    width: '100%',
    height: '100px',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '12px',
    color: '#777',
    borderRadius: '0.375rem',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px 0 rgba(0,0,0,.06)',
  };

  // 掲載枠をトップとサイドに分ける
  const topSlots = promotionSlots.filter(slot => slot.position === 'home_top');
  const sideSlots = promotionSlots.filter(slot => slot.position === 'home_side');

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 有料掲載枠（トップ） */}
      {topSlots.length > 0 && (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">注目の動画</h2>
            {user && (
              <Link to="/youtuber/promotion" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800">
                掲載について
              </Link>
            )}
          </div>
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {topSlots.map((slot) => (
                <Link
                  key={slot.id}
                  to={`/video/${slot.videoId}`}
                  className="block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                  onClick={() => {
                    // クリック計測のロジックをここに追加
                    console.log(`Promotion slot ${slot.id} clicked`);
                  }}
                >
                  <div className="flex flex-row sm:block">
                    <div className="w-2/5 sm:w-full aspect-video relative">
                      <img
                        src={slot.thumbnailUrl}
                        alt={slot.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-black bg-opacity-70 text-white text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded">
                        {formatViewCount(slot.viewCount)}
                      </div>
                      <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-blue-600 text-white text-xs px-1 sm:px-2 py-0.5 rounded">
                        PR
                      </div>
                    </div>
                    <div className="w-3/5 sm:w-full p-2 sm:p-3">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {slot.title}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {slot.channelName}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 有料掲載枠（サイド） */}
      {sideSlots.length > 0 && (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
          <h2 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">おすすめチャンネル</h2>
          <div className="space-y-2">
            {sideSlots.map((slot) => (
              <Link
                key={slot.id}
                to={`/video/${slot.videoId}`}
                className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => {
                  // クリック計測のロジックをここに追加
                  console.log(`Side promotion slot ${slot.id} clicked`);
                }}
              >
                <div className="w-16 h-16 relative flex-shrink-0">
                  <img
                    src={slot.thumbnailUrl}
                    alt={slot.title}
                    className="w-full h-full object-cover rounded"
                    loading="lazy"
                  />
                  <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs px-1 py-0.5 rounded-sm">
                    PR
                  </div>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                    {slot.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {slot.channelName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatViewCount(slot.viewCount)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Google広告枠 */}
      <div className="bg-gray-100 p-3 sm:p-4 rounded-lg shadow-md">
        <h2 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">広告</h2>
        {/* モバイル用広告フレーム */}
        <div className="block sm:hidden" style={mobileAdFrameStyle}>
          広告表示
        </div>
        {/* デスクトップ用広告フレーム */}
        <div className="hidden sm:block" style={adFrameStyle}>
          広告表示
        </div>
        <div className="text-xs text-gray-500 mt-1 text-right">
          広告について
        </div>
      </div>

      {/* YouTuber向け掲載案内 - 未ログインまたは通常ユーザーの場合のみ表示 */}
      {(!user || !isYoutuber) && (
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg shadow-md border border-blue-200">
          <h2 className="text-base sm:text-lg font-semibold mb-1 text-blue-800">YouTuber向け広告掲載</h2>
          <p className="text-sm text-blue-700 mb-2">あなたの動画を多くの視聴者に届けましょう！</p>
          
          {/* 近日実装予定の通知を追加 */}
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mb-3 text-xs text-yellow-800 rounded-r">
            <strong>近日実装予定！</strong> 決済システム準備中です。
          </div>
          
          <Link 
            to="/youtuber/register" 
            className="w-full sm:w-auto inline-block text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            掲載について詳しく見る
          </Link>
        </div>
      )}
    </div>
  );
}