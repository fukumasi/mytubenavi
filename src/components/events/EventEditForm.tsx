import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

export default function EventEditForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<EventFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEventData();
    }
  }, [id]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (!event) {
        setError('イベントが見つかりません');
        return;
      }

      if (event.organizer_id !== user?.id) {
        setError('このイベントを編集する権限がありません');
        return;
      }

      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);

      setFormData({
        title: event.title,
        description: event.description,
        eventType: event.event_type,
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toTimeString().slice(0, 5),
        location: event.location,
        onlineUrl: event.online_url,
        maxParticipants: event.max_participants,
        price: event.price,
        status: event.status,
        thumbnailUrl: event.thumbnail_url
      });
    } catch (err) {
      console.error('Error fetching event:', err);
      setError('イベント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;

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

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = false) => {
    e.preventDefault();
    
    if (!user || !formData) {
      setError('ログインが必要です');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: formData.title,
          description: formData.description,
          event_type: formData.eventType,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          location: formData.eventType === 'offline' ? formData.location : null,
          online_url: formData.eventType === 'online' ? formData.onlineUrl : null,
          max_participants: formData.maxParticipants,
          price: formData.price,
          thumbnail_url: formData.thumbnailUrl,
          status: saveAsDraft ? 'draft' : 'published'
        })
        .eq('id', id);

      if (updateError) throw updateError;

      navigate(`/events/${id}`);
    } catch (err) {
      console.error('Error updating event:', err);
      setError('イベントの更新に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const renderForm = () => {
    if (!formData) return null;

    return (
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* タイトル */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            イベントタイトル
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        {/* イベントタイプ */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            開催形式
          </label>
          <div className="mt-2 space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="offline"
                checked={formData.eventType === 'offline'}
                onChange={(e) => setFormData({
                  ...formData,
                  eventType: e.target.value as 'offline' | 'online',
                  onlineUrl: ''
                })}
                className="form-radio text-indigo-600"
              />
              <span className="ml-2">会場で開催</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="online"
                checked={formData.eventType === 'online'}
                onChange={(e) => setFormData({
                  ...formData,
                  eventType: e.target.value as 'offline' | 'online',
                  location: ''
                })}
                className="form-radio text-indigo-600"
              />
              <span className="ml-2">オンライン開催</span>
            </label>
          </div>
        </div>

        {/* その他のフォームフィールド（開催日時、場所/URL、定員、参加費など）を追加 */}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            下書き保存
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? '更新中...' : '更新する'}
          </button>
        </div>
      </form>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">イベントを編集</h2>
        {renderForm()}
      </div>
    </div>
  );
}