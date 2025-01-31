import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import type { Event } from '../../types';

interface EventPreviewProps {
  event: Partial<Event>;
  className?: string;
}

interface StatusConfig {
  draft: string;
  published: string;
  cancelled: string;
}

export default function EventPreview({ event, className = '' }: EventPreviewProps) {
  const formatDateTime = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    if (!event.status) return null;

    const statusColors: StatusConfig = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    const statusLabels: StatusConfig = {
      draft: '下書き',
      published: '公開中',
      cancelled: 'キャンセル済み'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[event.status]}`}>
        {statusLabels[event.status]}
      </span>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {event.title || '（タイトル未設定）'}
            </h1>
            {event.eventType === 'online' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                オンライン
              </span>
            )}
          </div>
          {getStatusBadge()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            {event.startDate && (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">開始</p>
                  <p className="font-medium">{formatDateTime(event.startDate)}</p>
                </div>
              </div>
            )}

            {event.endDate && (
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">終了</p>
                  <p className="font-medium">{formatDateTime(event.endDate)}</p>
                </div>
              </div>
            )}

            {event.eventType === 'offline' && event.location && (
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">開催場所</p>
                  <p className="font-medium">{event.location}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {event.maxParticipants && (
              <div className="flex items-center">
                <Users className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">定員</p>
                  <p className="font-medium">{event.maxParticipants}名</p>
                </div>
              </div>
            )}

            {event.price !== undefined && (
              <div className="flex items-center">
                <div>
                  <p className="text-sm text-gray-500">参加費</p>
                  <p className="font-medium">
                    {event.price > 0
                      ? `¥${event.price.toLocaleString()}`
                      : '無料'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">イベント詳細</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">
              {event.description || '（説明文未設定）'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}