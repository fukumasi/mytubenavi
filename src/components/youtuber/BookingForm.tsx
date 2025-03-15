// src/components/youtuber/BookingForm.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faFilm, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import LoadingSpinner from '../ui/LoadingSpinner';
import { PromotionSlot } from '../../types/promotion';
import { Video } from '../../types/video';

interface BookingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slots, setSlots] = useState<PromotionSlot[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(7);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // 選択された掲載枠と期間に基づいて合計価格を計算
    if (selectedSlot && duration) {
      const slot = slots.find(s => s.id === selectedSlot);
      if (slot) {
        setTotalPrice(slot.price * duration);
      }
    } else {
      setTotalPrice(0);
    }
  }, [selectedSlot, duration, slots]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 利用可能な掲載枠を取得
      const { data: slotsData, error: slotsError } = await supabase
        .from('promotion_slots')
        .select('*')
        .order('created_at');

      if (slotsError) {
        console.error('掲載枠の取得に失敗しました:', slotsError);
        setError('掲載枠の取得に失敗しました');
        return;
      }

      // ユーザーがアップロードした動画を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('ユーザー情報の取得に失敗しました');
        return;
      }

      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('youtuber_id', user.id)
        .order('title');

      if (videosError) {
        console.error('動画情報の取得に失敗しました:', videosError);
        setError('動画情報の取得に失敗しました');
        return;
      }

      setSlots(slotsData || []);
      setVideos(videosData || []);

      // 明日の日付をデフォルトの開始日に設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);

    } catch (err) {
      console.error('データ取得中にエラーが発生しました:', err);
      setError('データ取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // バリデーション
    if (!selectedSlot) {
      setError('掲載枠を選択してください');
      return;
    }

    if (!selectedVideo) {
      setError('動画を選択してください');
      return;
    }

    if (!startDate) {
      setError('開始日を入力してください');
      return;
    }

    if (!duration || duration < 1) {
      setError('有効な期間を入力してください');
      return;
    }

    try {
      setSubmitting(true);

      // 選択された掲載枠情報を取得
      const slot = slots.find(s => s.id === selectedSlot);
      if (!slot) {
        setError('選択された掲載枠が見つかりません');
        return;
      }

      // 開始日と終了日を計算
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + duration);

      // ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('ユーザー情報の取得に失敗しました');
        return;
      }

      // 予約データを作成
      const bookingData = {
        user_id: user.id,
        youtuber_id: user.id,
        slot_id: selectedSlot,
        video_id: selectedVideo,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        duration: duration,
        amount: totalPrice,
        status: 'pending',
        payment_status: 'pending'
      };

      // ここで実際の予約処理を行う
      // 注: 実際の実装では、Stripeを使った決済処理などが必要になります
      const { data: bookingResult, error: bookingError } = await supabase
        .from('slot_bookings')
        .insert([bookingData]);

      if (bookingError) {
        console.error('予約の作成に失敗しました:', bookingError);
        setError('予約の作成に失敗しました: ' + bookingError.message);
        return;
      }

      console.log('予約が作成されました:', bookingResult);
      
      // 実際の決済ページへのリダイレクトなどを行う代わりにコールバックを実行
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('予約処理中にエラーが発生しました:', err);
      setError('予約処理中にエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeLabel = (type: string) => {
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
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-6">掲載枠予約</h2>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="slot" className="block text-sm font-medium text-gray-700 mb-1">
            掲載枠タイプ <span className="text-red-500">*</span>
          </label>
          <select
            id="slot"
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            required
          >
            <option value="">掲載枠を選択してください</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.name} ({getTypeLabel(slot.type)}) - {slot.price.toLocaleString()}円/日
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="video" className="block text-sm font-medium text-gray-700 mb-1">
            掲載する動画 <span className="text-red-500">*</span>
          </label>
          <select
            id="video"
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
            required
          >
            <option value="">動画を選択してください</option>
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
          {videos.length === 0 && (
            <p className="mt-2 text-sm text-yellow-600">
              <FontAwesomeIcon icon={faFilm} className="mr-1" />
              表示できる動画がありません。まずはYouTubeと同期してください。
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              開始日 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
              </div>
              <input
                type="date"
                id="startDate"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              掲載期間（日数） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="duration"
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min={1}
              max={90}
              required
            />
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-blue-800">お支払い金額</h3>
            <div className="text-xl font-bold text-blue-800">
              <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
              {totalPrice.toLocaleString()}円
            </div>
          </div>
          <p className="text-sm text-blue-600 mt-2">
            お支払いは次のステップで行います。予約内容を確認後、決済ページに進みます。
          </p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={onCancel}
            disabled={submitting}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            disabled={submitting}
          >
            {submitting ? '処理中...' : '予約する'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;