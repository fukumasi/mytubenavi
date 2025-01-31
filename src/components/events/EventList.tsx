import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Event } from '../../types';

interface DatabaseEvent {
  id: string;
  title: string;
  description: string;
  event_type: 'online' | 'offline';
  start_date: string;
  end_date: string;
  location?: string;
  online_url?: string;
  max_participants?: number;
  price: number;
  thumbnail_url?: string;
  organizer_id: string;
  status: 'draft' | 'published' | 'cancelled';
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
  event_participants?: {
    count: number;
  }[];
}

export default function EventList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [filter, searchQuery]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date().toISOString();
      let query = supabase
        .from('events')
        .select(`
          *,
          profiles:organizer_id(
            username,
            avatar_url
          ),
          event_participants(count)
        `);

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (filter === 'upcoming') {
        query = query.gte('start_date', now);
      } else if (filter === 'past') {
        query = query.lt('start_date', now);
      }

      const { data, error: fetchError } = await query.order('start_date', { ascending: true });

      if (fetchError) throw fetchError;

      const formattedEvents: Event[] = (data || []).map((dbEvent: DatabaseEvent) => ({
        id: dbEvent.id,
        title: dbEvent.title,
        description: dbEvent.description,
        eventType: dbEvent.event_type,
        startDate: new Date(dbEvent.start_date),
        endDate: new Date(dbEvent.end_date),
        location: dbEvent.location,
        onlineUrl: dbEvent.online_url,
        maxParticipants: dbEvent.max_participants,
        price: dbEvent.price,
        thumbnailUrl: dbEvent.thumbnail_url,
        organizerId: dbEvent.organizer_id,
        status: dbEvent.status,
        isFeatured: dbEvent.is_featured,
        createdAt: new Date(dbEvent.created_at),
        updatedAt: new Date(dbEvent.updated_at)
      }));

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('イベントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="イベントを検索..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
        {['all', 'upcoming', 'past'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption as typeof filter)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === filterOption
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filterOption === 'all' ? 'すべて' : 
             filterOption === 'upcoming' ? '開催予定' : '過去のイベント'}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          イベントがありません
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => navigate(`/events/${event.id}`)}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {event.title}
                </h3>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatDateTime(event.startDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{formatDateTime(event.endDate)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.maxParticipants !== undefined && (
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      <span>
                        0 / {event.maxParticipants}人
                      </span>
                    </div>
                  )}
                </div>

                {event.status === 'cancelled' && (
                  <div className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium mb-4">
                    キャンセル済み
                  </div>
                )}

                {event.price > 0 && (
                  <div className="text-sm font-medium text-gray-900">
                    参加費: ¥{event.price.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}