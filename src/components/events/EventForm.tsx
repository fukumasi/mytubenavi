import { useState, useCallback } from 'react';
import { Tab } from '@headlessui/react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import EventPreview from './EventPreview';
import type { Event } from '../../types';
import ErrorMessage from './ErrorMessage';

interface EventFormData {
  title: string;
  description: string;
  eventType: 'online' | 'offline';
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location?: string;
  onlineUrl?: string;
  maxParticipants?: number;
  price: number;
  status: 'draft' | 'published';
  thumbnailUrl?: string;
}

const initialFormData: EventFormData = {
  title: '',
  description: '',
  eventType: 'offline',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  location: '',
  onlineUrl: '',
  maxParticipants: undefined,
  price: 0,
  status: 'draft',
  thumbnailUrl: ''
};


export default function EventForm() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});


    const validateField = (fieldName: keyof EventFormData, value: any): string | null => {
    switch (fieldName) {
      case 'title':
        if (!value?.trim()) return 'イベントタイトルを入力してください';
        if (value.length > 100) return 'イベントタイトルは100文字以内で入力してください';
        return null;
      
      case 'description':
        if (!value?.trim()) return 'イベントの説明を入力してください';
        if (value.length > 2000) return 'イベントの説明は2000文字以内で入力してください';
        return null;

      case 'startDate':
      case 'startTime':
      case 'endDate':
      case 'endTime':
        if (!value) return '日時を入力してください';
        return null;

      case 'location':
        if (formData.eventType === 'offline') {
          if (!value?.trim()) return '開催場所を入力してください';
          if (value.length > 200) return '開催場所は200文字以内で入力してください';
        }
        return null;

      case 'onlineUrl':
        if (formData.eventType === 'online') {
          if (!value?.trim()) return 'オンラインイベントURLを入力してください';
          try {
            new URL(value);
          } catch {
            return '有効なURLを入力してください';
          }
        }
        return null;

      case 'maxParticipants':
        if (value !== undefined) {
          if (value <= 0) return '定員は1名以上に設定してください';
          if (value > 1000) return '定員は1000名以下に設定してください';
        }
        return null;

      case 'price':
        if (value < 0) return '参加費は0円以上に設定してください';
          if (value > 100000) return '参加費は100,000円以下に設定してください';
        return null;

      default:
        return null;
    }
  };


  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('イベントタイトルを入力してください');
      return false;
    }

    if (!formData.description.trim()) {
      setError('イベントの説明を入力してください');
      return false;
    }

    if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      setError('開始日時と終了日時を入力してください');
      return false;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (endDateTime <= startDateTime) {
      setError('終了日時は開始日時より後に設定してください');
      return false;
    }

    if (formData.eventType === 'offline' && !formData.location) {
      setError('開催場所を入力してください');
      return false;
    }

    if (formData.eventType === 'online' && !formData.onlineUrl) {
      setError('オンラインイベントのURLを入力してください');
      return false;
    }

    if (formData.maxParticipants !== undefined && formData.maxParticipants <= 0) {
      setError('定員は1名以上に設定してください');
      return false;
    }

    if (formData.price < 0) {
      setError('参加費は0円以上に設定してください');
      return false;
    }

    return true;
  };
  
    const generatePreviewData = useCallback((): Partial<Event> => {
        try {
            const startDateTime = formData.startDate && formData.startTime
              ? new Date(`${formData.startDate}T${formData.startTime}`)
              : undefined;
    
            const endDateTime = formData.endDate && formData.endTime
              ? new Date(`${formData.endDate}T${formData.endTime}`)
              : undefined;
    
            return {
              title: formData.title,
              description: formData.description,
              eventType: formData.eventType,
              startDate: startDateTime,
              endDate: endDateTime,
              location: formData.eventType === 'offline' ? formData.location : undefined,
              onlineUrl: formData.eventType === 'online' ? formData.onlineUrl : undefined,
              maxParticipants: formData.maxParticipants,
              price: formData.price,
              status: formData.status,
              thumbnailUrl: formData.thumbnailUrl
            };
          } catch (err) {
            console.error('Error generating preview data:', err);
            return {};
          }
    }, [formData]);


  const handleFormChange = (
    fieldName: keyof EventFormData,
    value: string | number | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
      // イベントタイプが変更された場合、関連フィールドをリセット
      ...(fieldName === 'eventType' && {
        location: value === 'offline' ? '' : undefined,
        onlineUrl: value === 'online' ? '' : undefined
      })
    }));
       // フィールドごとのバリデーション実行
    const error = validateField(fieldName, value);
    setFieldErrors(prev => ({
        ...prev,
        [fieldName]: error || undefined
    }));
  };


  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = false) => {
    e.preventDefault();
      
    if (!currentUser) {
        setError('ログインが必要です');
        return;
    }
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
        const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
          title: formData.title,
          description: formData.description,
          eventType: formData.eventType,
          startDate: startDateTime,
          endDate: endDateTime,
          location: formData.eventType === 'offline' ? formData.location : undefined,
          onlineUrl: formData.eventType === 'online' ? formData.onlineUrl : undefined,
          maxParticipants: formData.maxParticipants,
          price: formData.price,
          thumbnailUrl: formData.thumbnailUrl,
          organizerId: currentUser.id,
          status: saveAsDraft ? 'draft' : 'published',
          isFeatured: false
      };
      
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([{
            title: eventData.title,
            description: eventData.description,
            event_type: eventData.eventType,
            start_date: eventData.startDate.toISOString(),
            end_date: eventData.endDate.toISOString(),
            location: eventData.location,
            online_url: eventData.onlineUrl,
            max_participants: eventData.maxParticipants,
            price: eventData.price,
            thumbnail_url: eventData.thumbnailUrl,
            organizer_id: eventData.organizerId,
            status: eventData.status,
            is_featured: eventData.isFeatured
          }])
          .select()
          .single();


      if (insertError) throw insertError;

      navigate(`/events/${newEvent.id}`);
    } catch (err) {
      console.error('Error creating event:', err);
      setError('イベントの作成に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

    const renderFieldError = (fieldName: keyof EventFormData) => {
        const error = fieldErrors[fieldName];
        if (!error) return null;
    
        return (
        <p className="mt-1 text-sm text-red-600">
            {error}
        </p>
        );
    };



  return (
    <div className="max-w-4xl mx-auto">
       <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex space-x-4 border-b border-gray-200 mb-6">
          <Tab className={({ selected }) =>
            `px-4 py-2 text-sm font-medium border-b-2 outline-none ${
              selected
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`
          }>
            編集
          </Tab>
          <Tab className={({ selected }) =>
            `px-4 py-2 text-sm font-medium border-b-2 outline-none ${
              selected
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`
          }>
            プレビュー
          </Tab>
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel>
            <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">イベントを作成</h2>

                {error && <ErrorMessage message={error} className="mb-6" />}

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
             {/* イベントタイトル */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              イベントタイトル
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    fieldErrors.title 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
              required
            />
            {renderFieldError('title')}
          </div>

          {/* イベントタイプ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開催形式
                  </label>
                  <div className="space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="offline"
                        checked={formData.eventType === 'offline'}
                        onChange={(e) => handleFormChange('eventType', e.target.value as 'offline' | 'online')}
                        className="form-radio text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2">会場で開催</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="online"
                        checked={formData.eventType === 'online'}
                        onChange={(e) => handleFormChange('eventType', e.target.value as 'offline' | 'online')}
                        className="form-radio text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2">オンライン開催</span>
                    </label>
                  </div>
                  {renderFieldError('eventType')}
                </div>

                {/* 開催日時の入力 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      開始日
                    </label>
                    <div className="mt-1 relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        id="startDate"
                        value={formData.startDate}
                        onChange={(e) => handleFormChange('startDate', e.target.value)}
                        className={`block w-full pl-10 rounded-md shadow-sm sm:text-sm ${
                          fieldErrors.startDate
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                        required
                      />
                    </div>
                    {renderFieldError('startDate')}
                  </div>
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                      開始時間
                    </label>
                    <div className="mt-1 relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        id="startTime"
                        value={formData.startTime}
                        onChange={(e) => handleFormChange('startTime', e.target.value)}
                        className={`block w-full pl-10 rounded-md shadow-sm sm:text-sm ${
                          fieldErrors.startTime
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                        required
                      />
                    </div>
                    {renderFieldError('startTime')}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      終了日
                    </label>
                    <div className="mt-1 relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        id="endDate"
                        value={formData.endDate}
                        onChange={(e) => handleFormChange('endDate', e.target.value)}
                        className={`block w-full pl-10 rounded-md shadow-sm sm:text-sm ${
                          fieldErrors.endDate
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                        required
                      />
                    </div>
                    {renderFieldError('endDate')}
                  </div>
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                      終了時間
                    </label>
                    <div className="mt-1 relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        id="endTime"
                        value={formData.endTime}
                        onChange={(e) => handleFormChange('endTime', e.target.value)}
                        className={`block w-full pl-10 rounded-md shadow-sm sm:text-sm ${
                          fieldErrors.endTime
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                        required
                      />
                    </div>
                    {renderFieldError('endTime')}
                  </div>
                </div>

                {/* 開催場所/URL */}
                {formData.eventType === 'offline' ? (
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      開催場所
                    </label>
                    <div className="mt-1 relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        id="location"
                        value={formData.location || ''}
                        onChange={(e) => handleFormChange('location', e.target.value)}
                        className={`block w-full pl-10 rounded-md shadow-sm sm:text-sm ${
                          fieldErrors.location
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                        placeholder="例：東京都渋谷区〇〇ビル 3階"
                        required
                      />
                    </div>
                    {renderFieldError('location')}
                    <p className="mt-1 text-sm text-gray-500">
                      できるだけ詳しい住所を入力してください
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="onlineUrl" className="block text-sm font-medium text-gray-700">
                      オンラインイベントURL
                    </label>
                    <div className="mt-1">
                      <input
                        type="url"
                        id="onlineUrl"
                        value={formData.onlineUrl || ''}
                        onChange={(e) => handleFormChange('onlineUrl', e.target.value)}
                        className={`block w-full rounded-md shadow-sm sm:text-sm ${
                          fieldErrors.onlineUrl
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                        placeholder="https://..."
                        required
                      />
                    </div>
                    {renderFieldError('onlineUrl')}
                    <p className="mt-1 text-sm text-gray-500">
                      ZoomやGoogle Meetなどのミーティング用URLを入力してください
                    </p>
                  </div>
                )}

                {/* 定員 */}
                <div>
                  <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700">
                    定員
                  </label>
                  <div className="mt-1 relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      id="maxParticipants"
                      min="1"
                      value={formData.maxParticipants || ''}
                      onChange={(e) => handleFormChange(
                        'maxParticipants',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )}
                      className={`block w-full pl-10 rounded-md shadow-sm sm:text-sm ${
                        fieldErrors.maxParticipants
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                      placeholder="例：20"
                    />
                  </div>
                  {renderFieldError('maxParticipants')}
                  <p className="mt-1 text-sm text-gray-500">
                    空欄の場合は定員無制限となります
                  </p>
                </div>

                {/* 参加費 */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    参加費（円）
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      id="price"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleFormChange('price', parseInt(e.target.value))}
                      className={`block w-full rounded-md shadow-sm sm:text-sm ${
                        fieldErrors.price
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                      placeholder="例：1000"
                      required
                    />
                  </div>
                  {renderFieldError('price')}
                  <p className="mt-1 text-sm text-gray-500">
                    無料の場合は0を入力してください
                  </p>
                </div>

                {/* イベント説明 */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    イベント説明
                  </label>
                  <textarea
                    id="description"
                    rows={6}
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      fieldErrors.description
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    placeholder="イベントの詳細な説明を入力してください"
                    required
                  />
                  {renderFieldError('description')}
                  <p className="mt-1 text-sm text-gray-500">
                    参加者に向けて、イベントの魅力や参加によって得られる価値を具体的に説明しましょう
                  </p>
                </div>
              </form>
            </div>
          </Tab.Panel>

          <Tab.Panel>
          <EventPreview 
              event={generatePreviewData()}
              className="bg-gray-50"
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* フォームの送信ボタンは常に表示 */}
      <div className="mt-6 flex justify-end space-x-4">
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          下書き保存
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? '作成中...' : '公開する'}
        </button>
      </div>
    </div>
  );
}