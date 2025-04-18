import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Video, ExternalLink, Clock, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import CancelEventModal from './CancelEventModal';
import type { Event } from '@/types';
import type { Participant, DatabaseParticipant } from '@/types/events';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('events')
        .select(`
          *,
          profiles:organizer_id(username, avatar_url),
          event_participants(
            id, user_id, status,
            profiles:user_id(username, avatar_url)
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('イベントが見つかりません');

      const formattedEvent: Event = {
        ...data,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        eventType: data.event_type,
        maxParticipants: data.max_participants || undefined,
        onlineUrl: data.online_url || undefined,
        thumbnailUrl: data.thumbnail_url || undefined
      };
       
      // 修正箇所1を適用
      const formattedParticipants = (data.event_participants || [])
        .filter((p: any): p is DatabaseParticipant => Boolean(p.profiles))
        .map((p: DatabaseParticipant) => ({
          id: p.id,
          user_id: p.user_id,
          status: p.status,
          user: {
            username: p.profiles.username,
            avatar_url: p.profiles.avatar_url
          }
        }));


      setEvent(formattedEvent);
      setParticipants(formattedParticipants);
      
      // 修正箇所2を適用
      setIsParticipant(
        formattedParticipants.some((p: Participant) =>
          p.user_id === currentUser?.id && p.status !== 'cancelled'
        )
      );

    } catch (err) {
      console.error('Error fetching event details:', err);
      setError(err instanceof Error ? err.message : 'イベント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    if (!currentUser) {
      setError('参加するにはログインが必要です');
      return;
    }

    try {
      const { error: joinError } = await supabase
        .from('event_participants')
        .insert([{ 
          event_id: id, 
          user_id: currentUser.id,
          status: 'pending'
        }]);

      if (joinError) throw joinError;
      await fetchEventDetails();

    } catch (err) {
      console.error('Error joining event:', err);
      setError('イベントへの参加に失敗しました');
    }
  };

  const handleCancelEvent = async () => {
    if (!currentUser || !event) return;

    try {
      if (currentUser.id === event.organizerId) {
        await supabase
          .from('events')
          .update({ status: 'cancelled' })
          .eq('id', event.id);

        await supabase
          .from('event_participants')
          .update({ status: 'cancelled' })
          .eq('event_id', event.id);
      } else {
        await supabase
          .from('event_participants')
          .update({ status: 'cancelled' })
          .eq('event_id', event.id)
          .eq('user_id', currentUser.id);
      }

      setShowCancelModal(false);
      await fetchEventDetails();

    } catch (err) {
      console.error('Error cancelling event:', err);
      setError('キャンセル処理に失敗しました');
    }
  };

  const formatDateTime = (date: Date) => {
    return format(date, 'yyyy年M月d日(E) HH:mm', { locale: ja });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
          {error || 'イベントが見つかりません'}
        </div>
      </div>
    );
  }

  const isOrganizer = currentUser?.id === event.organizerId;
  const participantCount = participants.filter(p => p.status !== 'cancelled').length;
  const isFullyBooked = event.maxParticipants ? participantCount >= event.maxParticipants : false;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          {/* イベントヘッダー */}
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {event.title}
            </h1>
            {event.status === 'cancelled' && (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                キャンセル済み
              </span>
            )}
          </div>

          {/* イベント情報 */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {formatDateTime(event.startDate)}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {formatDateTime(event.endDate)}
            </div>
            {event.eventType === 'offline' ? (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {event.location}
              </div>
            ) : (
              <div className="flex items-center">
                <Video className="w-4 h-4 mr-2" />
                オンライン
              </div>
            )}
            {event.maxParticipants && (
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                {participantCount}/{event.maxParticipants}名
              </div>
            )}
            {event.price > 0 && (
              <div className="font-medium text-gray-900">
                ¥{event.price.toLocaleString()}
              </div>
            )}
          </div>

          {/* イベント詳細 */}
          <div className="prose max-w-none mb-8">
            <p>{event.description}</p>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-center space-x-4">
            {event.status === 'published' && !isParticipant && (
              <button
                onClick={handleJoinEvent}
                disabled={isFullyBooked}
                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isFullyBooked ? '定員に達しました' : '参加する'}
              </button>
            )}
            {(isParticipant || isOrganizer) && event.status !== 'cancelled' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {isOrganizer ? 'イベントをキャンセル' : '参加をキャンセル'}
              </button>
            )}
            {isOrganizer && (
              <Link
                to={`/events/${event.id}/edit`}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                編集
              </Link>
            )}
          </div>

          {/* オンラインURL */}
          {event.eventType === 'online' && isParticipant && 
           event.status === 'published' && event.onlineUrl && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  ミーティングURL
                </span>
                <a
                  href={event.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-indigo-600 hover:text-indigo-700"
                >
                  <span className="mr-2">参加する</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 参加者リスト */}
        {participants.length > 0 && (
          <div className="border-t border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              参加者 ({participantCount}名)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {participants
                .filter(p => p.status !== 'cancelled')
                .map(participant => (
                  <div key={participant.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                      {participant.user.avatar_url ? (
                        <img
                          src={participant.user.avatar_url}
                          alt={participant.user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-4 h-4 m-2 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {participant.user.username}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <CancelEventModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelEvent}
        isOrganizer={isOrganizer}
      />
    </div>
  );
}