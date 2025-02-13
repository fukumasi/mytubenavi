// src/components/youtuber/PromotionDashboard.tsx

import { useState, useEffect } from 'react';
import { 
  Upload,
  Edit,
  Trash2,
  DollarSign,
  ImageIcon,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile, PromotionSlot } from '../../types';

export default function PromotionDashboard() {
  const { currentUser, youtuberProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [promotionSlots, setPromotionSlots] = useState<PromotionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) return;
      
      setLoading(true);
      setError(null);

      try {
        if (!youtuberProfile) {
          setError('YouTuberプロフィールが未登録です');
          return;
        }

        const [profileResult, slotsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single(),
          supabase
            .from('promotion_slots')
            .select(`
              *,
              bookings:slot_bookings(
                count
              )
            `)
            .eq('youtuber_id', currentUser.id)
        ]);

        if (profileResult.error) throw profileResult.error;
        if (slotsResult.error) throw slotsResult.error;

        setProfile(profileResult.data);
        setPromotionSlots(slotsResult.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, youtuberProfile]);

  const handleCreateSlot = () => {
    // 新規作成モーダルを表示
    console.log('Create slot');
  };

  const handleEditSlot = (slotId: string) => {
    // 編集モーダルを表示
    console.log('Edit slot:', slotId);
  };

  const handleDeleteSlot = async (slotId: string) => {
    const slot = promotionSlots.find(s => s.id === slotId);
    const bookingsCount = slot?.bookings?.[0]?.count ?? 0;

    if (bookingsCount > 0) {
      alert('アクティブな予約が存在するため削除できません');
      return;
    }

    if (!window.confirm('この掲載枠を削除してもよろしいですか？')) return;

    try {
      const { error } = await supabase
        .from('promotion_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      setPromotionSlots(slots => slots.filter(slot => slot.id !== slotId));
    } catch (err) {
      console.error('Error deleting slot:', err);
      alert('削除に失敗しました');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* サイドバー */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-900">
                {youtuberProfile?.username || profile?.username}
              </h2>
              <p className="text-xs text-gray-500">YouTuber</p>
            </div>
          </div>

          <button 
            onClick={handleCreateSlot}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors mb-6"
          >
            <Upload className="inline-block w-4 h-4 mr-2" />
            掲載枠を登録する
          </button>

          <div className="text-xs text-gray-500">
            <p>※ 掲載枠は最大5つまで作成できます</p>
            <p className="mt-1">※ アクティブな予約がある掲載枠は削除できません</p>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-grow">
        <div className="space-y-8">
          <section>
            <div className="flex items-center mb-4">
              <DollarSign className="h-6 w-6 text-indigo-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">掲載枠管理</h2>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">読み込み中...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">
                      掲載枠一覧 
                      <span className="ml-2 text-sm text-gray-500">
                        ({promotionSlots.length}/5)
                      </span>
                    </h2>
                    <button 
                      onClick={handleCreateSlot}
                      disabled={promotionSlots.length >= 5}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      新規作成
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {promotionSlots.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      掲載枠がまだ登録されていません
                    </div>
                  ) : (
                    promotionSlots.map(slot => {
                      const bookingsCount = slot.bookings?.[0]?.count ?? 0;
                      return (
                        <div key={slot.id} className="p-6 flex items-start space-x-4">
                          <div className="relative flex-shrink-0 w-48">
                            {slot.image_url ? (
                              <img 
                                src={slot.image_url} 
                                alt={slot.name}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-sm font-medium text-gray-900">{slot.name}</h3>
                            <div className="mt-2 text-sm text-gray-500">
                              <p>{slot.description}</p>
                              <p className="mt-1">価格: ¥{slot.price.toLocaleString()}/日</p>
                              {bookingsCount > 0 && (
                                <p className="mt-1 text-indigo-600">
                                  アクティブな予約: {bookingsCount}件
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleEditSlot(slot.id)}
                              className="p-2 text-gray-400 hover:text-gray-500 transition-colors"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteSlot(slot.id)}
                              disabled={bookingsCount > 0}
                              className="p-2 text-gray-400 hover:text-red-500 disabled:text-gray-300 disabled:hover:text-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}