// src/components/youtuber/BookingForm.tsx

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarAlt, 
  faFilm, 
  faMoneyBillWave, 
  faExclamationCircle, 
  faCheckCircle, 
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import LoadingSpinner from '../ui/LoadingSpinner';
import { PromotionSlot } from '../../types/promotion';
import { Video } from '../../types/video';
import { formatDate } from '../../utils/dateUtils';
import { useStripeContext } from '../../contexts/StripeContext';

interface BookingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type AlertType = 'error' | 'success' | 'info' | null;

interface AlertState {
  type: AlertType;
  message: string;
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
  const [alert, setAlert] = useState<AlertState>({ type: null, message: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [slotDetails, setSlotDetails] = useState<PromotionSlot | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { initiatePayment } = useStripeContext();

  // フォームフィールドの検証状態
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // 選択された掲載枠と期間に基づいて合計価格を計算
    if (selectedSlot && duration) {
      const slot = slots.find(s => s.id === selectedSlot);
      if (slot) {
        setSlotDetails(slot);
        setTotalPrice(slot.price * duration);
        
        // 掲載期間の上限検証
        if (slot.max_duration && duration > slot.max_duration) {
          setValidationErrors(prev => ({
            ...prev,
            duration: `この掲載枠の最大期間は${slot.max_duration}日です`
          }));
        } else {
          setValidationErrors(prev => {
            const { duration, ...rest } = prev;
            return rest;
          });
        }
      }
    } else {
      setSlotDetails(null);
      setTotalPrice(0);
    }
  }, [selectedSlot, duration, slots]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setAlert({ type: null, message: '' });

      // 利用可能な掲載枠を取得
      const { data: slotsData, error: slotsError } = await supabase
        .from('promotion_slots')
        .select('*')
        .eq('is_active', true)  // アクティブな掲載枠のみ取得
        .order('price');

      if (slotsError) {
        console.error('掲載枠の取得に失敗しました:', slotsError);
        setAlert({ 
          type: 'error', 
          message: '掲載枠の取得に失敗しました。しばらく経ってからお試しください。' 
        });
        return;
      }

      // ユーザーがアップロードした動画を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAlert({ 
          type: 'error', 
          message: 'ユーザー情報の取得に失敗しました。再度ログインしてください。' 
        });
        return;
      }

      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('youtuber_id', user.id)
        .order('title');

      if (videosError) {
        console.error('動画情報の取得に失敗しました:', videosError);
        setAlert({ 
          type: 'error', 
          message: '動画情報の取得に失敗しました。YouTubeとの同期を確認してください。' 
        });
        return;
      }

      setSlots(slotsData || []);
      setVideos(videosData || []);

      // 明日の日付をデフォルトの開始日に設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);

      // 初期データが空の場合のアラート
      if ((slotsData?.length || 0) === 0) {
        setAlert({
          type: 'info',
          message: '現在、予約可能な掲載枠がありません。また後でお試しください。'
        });
      } else if ((videosData?.length || 0) === 0) {
        setAlert({
          type: 'info',
          message: '表示できる動画がありません。まずはYouTubeと同期してください。'
        });
      }

    } catch (err) {
      console.error('データ取得中にエラーが発生しました:', err);
      setAlert({ 
        type: 'error', 
        message: 'データ取得中にエラーが発生しました。ネットワーク接続を確認してください。' 
      });
    } finally {
      setLoading(false);
    }
  };

  // フィールドがフォーカスを失った時の処理
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  // 特定のフィールドの検証
  const validateField = (field: string) => {
    let errors: Record<string, string> = { ...validationErrors };

    switch (field) {
      case 'selectedSlot':
        if (!selectedSlot) {
          errors.selectedSlot = '掲載枠を選択してください';
        } else {
          delete errors.selectedSlot;
        }
        break;
      case 'selectedVideo':
        if (!selectedVideo) {
          errors.selectedVideo = '動画を選択してください';
        } else {
          delete errors.selectedVideo;
        }
        break;
      case 'startDate':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(startDate);
        
        if (!startDate) {
          errors.startDate = '開始日を入力してください';
        } else if (selectedDate < today) {
          errors.startDate = '開始日は今日以降を選択してください';
        } else {
          delete errors.startDate;
        }
        break;
      case 'duration':
        if (!duration || duration < 1) {
          errors.duration = '有効な期間を入力してください';
        } else if (slotDetails?.max_duration && duration > slotDetails.max_duration) {
          errors.duration = `この掲載枠の最大期間は${slotDetails.max_duration}日です`;
        } else {
          delete errors.duration;
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // フォーム全体の検証
  const validateForm = () => {
    // すべてのフィールドを検証
    const fields = ['selectedSlot', 'selectedVideo', 'startDate', 'duration'];
    let isValid = true;
    
    fields.forEach(field => {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    // すべてのフィールドをタッチ済みにする
    setTouched({
      selectedSlot: true,
      selectedVideo: true,
      startDate: true,
      duration: true
    });

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert({ type: null, message: '' });

    // フォーム検証
    if (!validateForm()) {
      setAlert({ 
        type: 'error', 
        message: '入力内容に誤りがあります。確認してください。' 
      });
      return;
    }

    try {
      setSubmitting(true);

      // 選択された掲載枠情報を取得
      const slot = slots.find(s => s.id === selectedSlot);
      if (!slot) {
        setAlert({ 
          type: 'error', 
          message: '選択された掲載枠が見つかりません。ページを更新してください。' 
        });
        return;
      }

      // 開始日と終了日を計算
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + duration);

      // ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAlert({ 
          type: 'error', 
          message: 'ユーザー情報の取得に失敗しました。再度ログインしてください。' 
        });
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
        payment_status: 'pending',
        created_at: new Date().toISOString()
      };

      // 予約データをデータベースに挿入
      const { data: bookingResult, error: bookingError } = await supabase
        .from('slot_bookings')
        .insert([bookingData])
        .select();

      if (bookingError) {
        console.error('予約の作成に失敗しました:', bookingError);
        setAlert({ 
          type: 'error', 
          message: '予約の作成に失敗しました: ' + bookingError.message 
        });
        return;
      }

      // 予約IDを取得
      const bookingId = bookingResult?.[0]?.id;
      
      if (!bookingId) {
        setAlert({ 
          type: 'error', 
          message: '予約IDの取得に失敗しました。管理者にお問い合わせください。' 
        });
        return;
      }

      // 決済処理を開始
      const paymentResult = await initiatePayment({
        amount: totalPrice,
        bookingId: bookingId,
        description: `掲載枠予約: ${slot.name} (${duration}日間)`,
        successUrl: `${window.location.origin}/youtuber/dashboard?payment=success`,
        cancelUrl: `${window.location.origin}/youtuber/dashboard?payment=canceled`
      });

      if (paymentResult.error) {
        setAlert({ 
          type: 'error', 
          message: '決済処理の初期化に失敗しました: ' + paymentResult.error 
        });
        return;
      }

      // 決済ページにリダイレクト
      if (paymentResult.redirectUrl) {
        window.location.href = paymentResult.redirectUrl;
      } else {
        // リダイレクトURLがない場合は成功コールバックを実行
        setAlert({ 
          type: 'success', 
          message: '予約が作成されました。お支払い処理に進みます。'
        });
        
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      }

    } catch (err: any) {
      console.error('予約処理中にエラーが発生しました:', err);
      setAlert({ 
        type: 'error', 
        message: `予約処理中にエラーが発生しました: ${err.message || '不明なエラー'}` 
      });
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

  const renderAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'error':
        return <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 mr-2" />;
      case 'success':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" />;
      case 'info':
        return <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mr-2" />;
      default:
        return null;
    }
  };

  const renderAlert = () => {
    if (!alert.type || !alert.message) return null;

    const bgColor = alert.type === 'error' ? 'bg-red-50' : 
                   alert.type === 'success' ? 'bg-green-50' : 
                   'bg-blue-50';
    const textColor = alert.type === 'error' ? 'text-red-700' : 
                     alert.type === 'success' ? 'text-green-700' : 
                     'text-blue-700';
    const borderColor = alert.type === 'error' ? 'border-red-200' : 
                       alert.type === 'success' ? 'border-green-200' : 
                       'border-blue-200';

    return (
      <div 
        className={`${bgColor} ${textColor} p-4 rounded-lg mb-6 border ${borderColor} flex items-start`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex-shrink-0 pt-0.5">
          {renderAlertIcon(alert.type)}
        </div>
        <div>{alert.message}</div>
      </div>
    );
  };

  // 掲載枠の詳細情報表示
  const renderSlotDetails = () => {
    if (!slotDetails) return null;

    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-2">掲載枠詳細</h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">タイプ:</span> {getTypeLabel(slotDetails.type)}</p>
          <p><span className="font-medium">表示位置:</span> {slotDetails.description || '指定なし'}</p>
          <p><span className="font-medium">1日あたりの料金:</span> {slotDetails.price.toLocaleString()}円</p>
          {slotDetails.max_duration && (
            <p><span className="font-medium">最大掲載期間:</span> {slotDetails.max_duration}日</p>
          )}
        </div>
      </div>
    );
  };

  // 予約内容の確認
  const renderBookingSummary = () => {
    if (!selectedSlot || !selectedVideo || !startDate || !duration) return null;

    const slot = slots.find(s => s.id === selectedSlot);
    const video = videos.find(v => v.id === selectedVideo);
    if (!slot || !video) return null;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + duration);

    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-2">予約内容の確認</h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">掲載枠:</span> {slot.name} ({getTypeLabel(slot.type)})</p>
          <p><span className="font-medium">動画:</span> {video.title}</p>
          <p><span className="font-medium">掲載期間:</span> {formatDate(startDateObj)} 〜 {formatDate(endDateObj)} ({duration}日間)</p>
        </div>
      </div>
    );
  };

  // フィールドエラーの表示
  const renderFieldError = (field: string) => {
    if (touched[field] && validationErrors[field]) {
      return (
        <div className="mt-1 text-sm text-red-600" role="alert">
          <FontAwesomeIcon icon={faExclamationCircle} className="mr-1" />
          {validationErrors[field]}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" aria-live="polite" aria-busy="true">
        <LoadingSpinner />
        <span className="sr-only">データを読み込み中です</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow" aria-labelledby="booking-form-title">
      <h2 id="booking-form-title" className="text-xl font-bold mb-6">掲載枠予約</h2>

      {renderAlert()}

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <label htmlFor="slot" className="block text-sm font-medium text-gray-700 mb-1">
            掲載枠タイプ <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="slot"
            className={`w-full border ${touched.selectedSlot && validationErrors.selectedSlot ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm py-2 px-3 focus:outline-none`}
            value={selectedSlot}
            onChange={(e) => {
              setSelectedSlot(e.target.value);
              if (touched.selectedSlot) validateField('selectedSlot');
            }}
            onBlur={() => handleBlur('selectedSlot')}
            required
            aria-required="true"
            aria-describedby={validationErrors.selectedSlot ? "slot-error" : undefined}
            aria-invalid={touched.selectedSlot && !!validationErrors.selectedSlot}
          >
            <option value="">掲載枠を選択してください</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.name} ({getTypeLabel(slot.type)}) - {slot.price.toLocaleString()}円/日
              </option>
            ))}
          </select>
          {renderFieldError('selectedSlot')}
        </div>

        {renderSlotDetails()}

        <div className="mb-6">
          <label htmlFor="video" className="block text-sm font-medium text-gray-700 mb-1">
            掲載する動画 <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="video"
            className={`w-full border ${touched.selectedVideo && validationErrors.selectedVideo ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm py-2 px-3 focus:outline-none`}
            value={selectedVideo}
            onChange={(e) => {
              setSelectedVideo(e.target.value);
              if (touched.selectedVideo) validateField('selectedVideo');
            }}
            onBlur={() => handleBlur('selectedVideo')}
            required
            aria-required="true"
            aria-describedby={validationErrors.selectedVideo ? "video-error" : undefined}
            aria-invalid={touched.selectedVideo && !!validationErrors.selectedVideo}
          >
            <option value="">動画を選択してください</option>
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
          {renderFieldError('selectedVideo')}
          {videos.length === 0 && (
            <p className="mt-2 text-sm text-yellow-600">
              <FontAwesomeIcon icon={faFilm} className="mr-1" aria-hidden="true" />
              表示できる動画がありません。まずはYouTubeと同期してください。
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              開始日 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="date"
                id="startDate"
                className={`w-full border ${touched.startDate && validationErrors.startDate ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none`}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (touched.startDate) validateField('startDate');
                }}
                onBlur={() => handleBlur('startDate')}
                min={new Date().toISOString().split('T')[0]}
                required
                aria-required="true"
                aria-describedby={validationErrors.startDate ? "startDate-error" : undefined}
                aria-invalid={touched.startDate && !!validationErrors.startDate}
              />
            </div>
            {renderFieldError('startDate')}
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              掲載期間（日数） <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              type="number"
              id="duration"
              className={`w-full border ${touched.duration && validationErrors.duration ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm py-2 px-3 focus:outline-none`}
              value={duration}
              onChange={(e) => {
                setDuration(parseInt(e.target.value) || 0);
                if (touched.duration) validateField('duration');
              }}
              onBlur={() => handleBlur('duration')}
              min={1}
              max={slotDetails?.max_duration || 90}
              required
              aria-required="true"
              aria-describedby={validationErrors.duration ? "duration-error" : undefined}
              aria-invalid={touched.duration && !!validationErrors.duration}
            />
            {renderFieldError('duration')}
            {slotDetails?.max_duration && (
              <p className="mt-1 text-xs text-gray-500">
                この掲載枠の最大期間は{slotDetails.max_duration}日です
              </p>
            )}
          </div>
        </div>

        {renderBookingSummary()}

        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-blue-800">お支払い金額</h3>
            <div className="text-xl font-bold text-blue-800">
              <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" aria-hidden="true" />
              {totalPrice.toLocaleString()}円
            </div>
          </div>
          <p className="text-sm text-blue-600 mt-2">
            このまま予約すると、安全な決済ページに移動します。キャンセルは予約開始の72時間前まで可能です。
          </p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={onCancel}
            disabled={submitting}
            aria-disabled={submitting}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={submitting || Object.keys(validationErrors).length > 0}
            aria-disabled={submitting || Object.keys(validationErrors).length > 0}
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                処理中...
              </>
            ) : '予約して支払いに進む'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;