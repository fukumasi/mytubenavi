// src/components/youtuber/BookingHistory.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faCheckCircle, faClock, faExclamationCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import LoadingSpinner from '../ui/LoadingSpinner';
import { SlotBooking } from '../../types/promotion';

const BookingHistory: React.FC = () => {
  const [bookings, setBookings] = useState<SlotBooking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      // ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('ユーザー情報の取得に失敗しました');
        return;
      }

      // 予約履歴を取得（関連する掲載枠と動画情報も一緒に）
      const { data, error } = await supabase
        .from('slot_bookings')
        .select(`
          *,
          slot:slot_id(id, name, type, price),
          video:video_id(id, title, thumbnail, youtube_id)
        `)
        .eq('youtuber_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('予約履歴の取得に失敗しました:', error);
        setError('予約履歴の取得に失敗しました');
        return;
      }

      setBookings(data || []);
    } catch (err) {
      console.error('予約履歴の取得中にエラーが発生しました:', err);
      setError('予約履歴の取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
      case 'pending':
        return <FontAwesomeIcon icon={faClock} className="text-yellow-500" />;
      case 'completed':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-blue-500" />;
      case 'cancelled':
        return <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />;
      default:
        return <FontAwesomeIcon icon={faExclamationCircle} className="text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">掲載中</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">準備中</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">完了</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">キャンセル</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">不明</span>;
    }
  };

  const getPaymentStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">支払済</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">未払い</span>;
      case 'refunded':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">返金済</span>;
      default:
        return null;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString('ja-JP')} 〜 ${end.toLocaleDateString('ja-JP')}`;
  };

  const getTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'premium':
        return 'プレミアム';
      case 'sidebar':
        return 'サイドバー';
      case 'genre':
        return 'ジャンル';
      case 'related':
        return '関連動画';
      default:
        return type || '不明';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded shadow">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
          {error}
        </div>
        <button
          onClick={fetchBookings}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          再試行
        </button>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="p-6 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-4">予約履歴</h2>
        <div className="mt-4 p-8 bg-gray-50 rounded-lg text-center">
          <FontAwesomeIcon icon={faCalendarAlt} className="text-4xl text-gray-400 mb-3" />
          <p className="text-gray-500 mb-4">掲載枠の予約履歴はありません</p>
          <button
            onClick={() => window.location.hash = '#bookings'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            掲載枠を予約する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-6">予約履歴</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                動画
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                掲載枠
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                掲載期間
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-16 bg-gray-100 rounded overflow-hidden">
                      {booking.video?.thumbnail ? (
                        <img
                          src={booking.video.thumbnail}
                          alt={booking.video?.title || ''}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center bg-gray-200">
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {booking.video?.title || '不明な動画'}
                      </div>
                      {booking.video?.youtube_id && (
                        <div className="text-xs text-gray-500">
                          <a 
                            href={`https://www.youtube.com/watch?v=${booking.video.youtube_id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline text-blue-600"
                          >
                            YouTubeで見る
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{booking.slot?.name || '不明な掲載枠'}</div>
                  <div className="text-xs text-gray-500">{getTypeLabel(booking.slot?.type)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDateRange(booking.start_date, booking.end_date)}
                  </div>
                  <div className="text-xs text-gray-500">{booking.duration}日間</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {booking.amount?.toLocaleString() || 0}円
                  </div>
                  <div className="text-xs">
                    {getPaymentStatusLabel(booking.payment_status)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(booking.status)}
                    <span className="ml-2">{getStatusLabel(booking.status)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingHistory;