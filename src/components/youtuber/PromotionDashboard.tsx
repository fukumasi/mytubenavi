// src/components/youtuber/PromotionDashboard.tsx

import { useState, useEffect } from 'react';
import { 
  Upload,
  Edit,
  Trash2,
  DollarSign,
  ImageIcon,
  AlertTriangle,
  BarChart2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile, PromotionSlot } from '../../types';
import type { SlotBooking } from '../../types/promotion';
import { formatDate } from "../../utils/dateUtils";
import CreateSlotModal from './CreateSlotModal';
import EditSlotModal from './EditSlotModal';

export default function PromotionDashboard() {
  const { user, youtuberProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [promotionSlots, setPromotionSlots] = useState<PromotionSlot[]>([]);
  const [bookings, setBookings] = useState<SlotBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings' | 'analytics'>('slots');
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0
  });

  // モーダル制御のための状態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PromotionSlot | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);

      try {
        if (!youtuberProfile) {
          setError('YouTuberプロフィールが未登録です');
          return;
        }

        const [profileResult, slotsResult, bookingsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single(),
          supabase
            .from('promotion_slots')
            .select(`
              *,
              bookings:slot_bookings(
                count
              )
            `), 
          supabase
            .from('slot_bookings')
            .select('*')  // videosの関連付けを一時的に削除
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ]);
        
        if (profileResult.error) throw profileResult.error;
        if (slotsResult.error) throw slotsResult.error;
        if (bookingsResult.error) throw bookingsResult.error;
        
        setProfile(profileResult.data);
        setPromotionSlots(slotsResult.data);
        setBookings(bookingsResult.data);
        
        // Analytics データの計算
        const completedBookings = bookingsResult.data.filter(b => b.status === 'completed');
        const activeBookings = bookingsResult.data.filter(b => b.status === 'active');
        
        setAnalyticsData({
          totalRevenue: completedBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0),
          totalBookings: bookingsResult.data.length,
          activeBookings: activeBookings.length,
          completedBookings: completedBookings.length
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, youtuberProfile]);

  const handleCreateSlot = () => {
    setSelectedSlot(null);
    setShowCreateModal(true);
  };

  const handleEditSlot = (slotId: string) => {
    const slot = promotionSlots.find(s => s.id === slotId);
    if (slot) {
      setSelectedSlot(slot);
      setShowEditModal(true);
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          アクティブ
        </span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          完了
        </span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          キャンセル
        </span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          保留中
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>;
    }
  };

  // 現在の予約をCSV形式でエクスポート
  const handleExportCSV = () => {
    const headers = ['予約ID', '掲載枠', '動画タイトル', '金額', '状態', '予約日', '開始日', '終了日'];
    
    const csvRows = [
      headers.join(','),
      ...bookings.map(booking => [
        booking.id,
        booking.slot?.name || '',
        booking.video?.title || '',
        booking.amount ? `¥${booking.amount.toLocaleString()}` : '¥0',
        booking.status,
        formatDate(booking.created_at),
        formatDate(booking.start_date),
        formatDate(booking.end_date)
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `予約データ_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      // 掲載枠データも更新
      const { data: slotsData, error: slotsError } = await supabase
        .from('promotion_slots')
        .select(`
          *,
          bookings:slot_bookings(
            count
          )
        `);  // youtuber_idの条件を削除
        
      if (slotsError) throw slotsError;
      setPromotionSlots(slotsData);
  
      // 予約データを更新
      const { data, error } = await supabase
        .from('slot_bookings')
        .select('*')  // 関連テーブルの取得を一時的に削除
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setBookings(data);
  
      // Analytics データの再計算
      const completedBookings = data.filter(b => b.status === 'completed');
      const activeBookings = data.filter(b => b.status === 'active');
      
      setAnalyticsData({
        totalRevenue: completedBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0),
        totalBookings: data.length,
        activeBookings: activeBookings.length,
        completedBookings: completedBookings.length
      });
    } catch (err) {
      console.error('Error refreshing data:', err);
      alert('データの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // モーダルが成功した後の処理
  const handleSlotSuccess = () => {
    refreshData();
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
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">YouTuberダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">
            動画プロモーションの管理とデータ分析
          </p>
        </div>
        
        <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-1">
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'slots' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            onClick={() => setActiveTab('slots')}
          >
            <Upload className="inline-block w-4 h-4 mr-1 align-text-bottom" />
            掲載枠
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'bookings' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            onClick={() => setActiveTab('bookings')}
          >
            <FileText className="inline-block w-4 h-4 mr-1 align-text-bottom" />
            予約
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 className="inline-block w-4 h-4 mr-1 align-text-bottom" />
            分析
          </button>
        </div>
      </div>

      {/* アナリティクスカード（常に表示） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                総収益
              </p>
              <h3 className="text-xl font-bold text-gray-900">
                ¥{analyticsData.totalRevenue.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                予約数
              </p>
              <h3 className="text-xl font-bold text-gray-900">
                {analyticsData.totalBookings}件
              </h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                アクティブな予約
              </p>
              <h3 className="text-xl font-bold text-gray-900">
                {analyticsData.activeBookings}件
              </h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                完了した予約
              </p>
              <h3 className="text-xl font-bold text-gray-900">
                {analyticsData.completedBookings}件
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex flex-col lg:flex-row gap-8">
        {activeTab === 'slots' && (
          <>
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
          </>
        )}

        {activeTab === 'bookings' && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">予約管理</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={refreshData}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  更新
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  CSVエクスポート
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">読み込み中...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {bookings.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    予約データがありません
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            予約情報
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            掲載枠
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            金額
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            期間
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状態
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            決済情報
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 relative">
                                  {booking.video?.thumbnail ? (
                                    <img
                                      className="h-10 w-10 rounded object-cover"
                                      src={booking.video.thumbnail}
                                      alt=""
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                                      <ImageIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4 max-w-xs truncate">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {booking.video?.title || "タイトルなし"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    予約ID: {booking.id.substring(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{booking.slot?.name || "不明"}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                ¥{booking.amount?.toLocaleString() || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDate(booking.start_date)} 〜 {formatDate(booking.end_date)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {booking.duration ? `${booking.duration}日間` : ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(booking.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.payment_intent_id ? (
                                <>
                                  <div className="text-xs">
                                    {booking.payment_intent_id.substring(0, 12)}...
                                  </div>
                                  <div className="text-xs mt-1">
                                    {formatDate(booking.created_at)}
                                  </div>
                                </>
                              ) : (
                                '未決済'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="w-full">
            <div className="flex items-center mb-4">
              <BarChart2 className="h-6 w-6 text-indigo-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">収益分析</h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">収益サマリー</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">総収益</h4>
                    <p className="text-3xl font-bold text-gray-900">
                      ¥{analyticsData.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">総予約数</h4>
                    <p className="text-3xl font-bold text-gray-900">{analyticsData.totalBookings}件</p>
                  </div>
                </div>
                
                <div>
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">ステータス別予約</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">アクティブ</span>
                        <div className="flex items-center">
                          <div className="w-32 h-2 bg-gray-200 rounded-full mr-2">
                            <div 
                              className="h-full bg-green-500 rounded-full" 
                              style={{ 
                                width: `${analyticsData.totalBookings 
                                  ? (analyticsData.activeBookings / analyticsData.totalBookings * 100) 
                                  : 0}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {analyticsData.activeBookings}件
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">完了</span>
                        <div className="flex items-center">
                          <div className="w-32 h-2 bg-gray-200 rounded-full mr-2">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ 
                                width: `${analyticsData.totalBookings 
                                  ? (analyticsData.completedBookings / analyticsData.totalBookings * 100) 
                                  : 0}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {analyticsData.completedBookings}件
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">その他</span>
                        <div className="flex items-center">
                          <div className="w-32 h-2 bg-gray-200 rounded-full mr-2">
                            <div 
                              className="h-full bg-gray-500 rounded-full" 
                              style={{ 
                                width: `${analyticsData.totalBookings 
                                  ? ((analyticsData.totalBookings - analyticsData.activeBookings - analyticsData.completedBookings) / analyticsData.totalBookings * 100) 
                                  : 0}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {analyticsData.totalBookings - analyticsData.activeBookings - analyticsData.completedBookings}件
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h4 className="text-sm font-medium text-gray-500 mb-4">予約データ詳細</h4>
                <p className="text-sm text-gray-500 mb-4">
                  詳細な収益データと分析はCSVをエクスポートして確認できます。
                </p>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  予約データCSVをエクスポート
                </button>
              </div>
            </div>
            
            <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">決済履歴</h3>
              
              {bookings.filter(b => b.payment_intent_id).length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  決済データがありません
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          日時
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          掲載枠
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          金額
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          状態
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings
                        .filter(b => b.payment_intent_id)
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(booking.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-xs text-gray-900">
                                {booking.payment_intent_id?.substring(0, 12)}...
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{booking.slot?.name || "不明"}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                ¥{booking.amount?.toLocaleString() || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(booking.status)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 掲載枠作成モーダル */}
      <CreateSlotModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSlotSuccess}
      />

      {/* 掲載枠編集モーダル */}
      {selectedSlot && (
        <EditSlotModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleSlotSuccess}
          slot={selectedSlot}
        />
      )}
    </div>
  );
}