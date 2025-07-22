import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
  const { user } = useAuth();
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const start = new Date(`${formData.startDate}T${formData.startTime}`);
    const end = new Date(`${formData.endDate}T${formData.endTime}`);
    if (end <= start) {
      setError('終了日時は開始日時より後に設定してください');
      return false;
    }
    if (formData.eventType === 'offline' && !formData.location) {
      setError('開催場所を入力してください');
      return false;
    }
    if (formData.eventType === 'online' && !formData.onlineUrl) {
      setError('オンラインイベントURLを入力してください');
      return false;
    }
    return true;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxParticipants' || name === 'price' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('ログインが必要です');
      return;
    }
    if (!validateForm()) return;

    try {
      setLoading(true);
      const start = new Date(`${formData.startDate}T${formData.startTime}`);
      const end = new Date(`${formData.endDate}T${formData.endTime}`);

      const { data, error: insertError } = await supabase
        .from('events')
        .insert({
          title: formData.title,
          description: formData.description,
          event_type: formData.eventType,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          location: formData.eventType === 'offline' ? formData.location : undefined,
          online_url: formData.eventType === 'online' ? formData.onlineUrl : undefined,
          max_participants: formData.maxParticipants,
          price: formData.price,
          thumbnail_url: formData.thumbnailUrl,
          organizer_id: user.id,
          status: formData.status,
          is_featured: false
        })
        .select()
        .single();

      if (insertError) throw insertError;
      navigate(`/events/${data.id}`);
    } catch (err) {
      console.error(err);
      setError('イベント作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">イベント作成</h1>
      {error && <ErrorMessage message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">タイトル</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">説明</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">開始日</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">開始時間</label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">終了日</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">終了時間</label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">開催形式</label>
          <select
            name="eventType"
            value={formData.eventType}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
          >
            <option value="offline">オフライン</option>
            <option value="online">オンライン</option>
          </select>
        </div>

        {formData.eventType === 'offline' ? (
          <div>
            <label className="block text-sm font-medium">場所</label>
            <input
              type="text"
              name="location"
              value={formData.location || ''}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium">オンラインURL</label>
            <input
              type="text"
              name="onlineUrl"
              value={formData.onlineUrl || ''}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">定員</label>
          <input
            type="number"
            name="maxParticipants"
            value={formData.maxParticipants ?? ''}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">参加費（円）</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded"
        >
          {loading ? '作成中...' : 'イベントを公開する'}
        </button>
      </form>
    </div>
  );
}
