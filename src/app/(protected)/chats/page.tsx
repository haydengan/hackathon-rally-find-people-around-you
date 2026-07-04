'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { MessageCircle, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ACTIVITY_TYPES } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface ChatEvent {
  id: string;
  title: string;
  activity_type: string;
  starts_at: string;
  spots_taken: number;
  total_spots: number;
  is_now: boolean;
  status: string;
}

interface DMConversation {
  partner_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  partner: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

function getActivityIconCircleClass(activityType: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityType)) return 'icon-circle-sports';
  if (fitnessTypes.includes(activityType)) return 'icon-circle-fitness';
  if (socialTypes.includes(activityType)) return 'icon-circle-social';
  if (creativeTypes.includes(activityType)) return 'icon-circle-creative';
  if (techTypes.includes(activityType)) return 'icon-circle-tech';
  if (outdoorTypes.includes(activityType)) return 'icon-circle-outdoor';
  if (gamingTypes.includes(activityType)) return 'icon-circle-gaming';
  return 'icon-circle-tech';
}

export default function ChatsPage() {
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dmLoading, setDmLoading] = useState(true);

  useEffect(() => {
    async function fetchMyEvents() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get events where user is a participant or creator
        const { data: participated } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', user.id);

        const eventIds = (participated ?? []).map((p) => p.event_id);

        // Also get events user created
        const { data: created } = await supabase
          .from('events')
          .select('id')
          .eq('creator_id', user.id);

        const createdIds = (created ?? []).map((e) => e.id);
        const allIds = [...new Set([...eventIds, ...createdIds])];

        if (allIds.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, activity_type, starts_at, spots_taken, total_spots, is_now, status')
          .in('id', allIds)
          .in('status', ['active', 'full', 'completed', 'archived'])
          .order('starts_at', { ascending: false });

        setEvents(eventsData ?? []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    async function fetchDMConversations() {
      try {
        const res = await fetch('/api/dm');
        if (res.ok) {
          const { data } = await res.json();
          setDmConversations(data);
        }
      } catch {
        // silently fail
      } finally {
        setDmLoading(false);
      }
    }

    fetchMyEvents();
    fetchDMConversations();
  }, []);

  function getActivityIcon(activityType: string): string {
    return ACTIVITY_TYPES.find((a) => a.value === activityType)?.icon ?? '📍';
  }

  if (loading && dmLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <h1 className="font-semibold text-lg">Chats</h1>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 backdrop-blur-xl border-b border-indigo-100/50 px-5 py-4 -mx-[calc((100vw-100%)/2)] px-[calc((100vw-100%)/2+1.25rem)]">
        <h1 className="font-bold text-xl text-gradient">Chats</h1>
      </div>

      {/* Direct Messages Section */}
      <div className="px-5 pt-5 pb-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200">
            <Mail className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <span className="text-blue-900">Direct Messages</span>
        </h2>
      </div>

      {dmConversations.length === 0 ? (
        <div className="px-5 pb-4 section-blue-tint mx-4 rounded-xl py-3">
          <p className="text-xs text-blue-600 font-medium">
            No direct messages yet. Follow someone and start a conversation! 👋
          </p>
        </div>
      ) : (
        <div className="mx-4 rounded-xl overflow-hidden section-blue-tint divide-y divide-blue-100/50">
          {dmConversations.map((conv) => (
            <Link
              key={conv.partner_id}
              href={`/chats/dm/${conv.partner_id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 transition-colors"
            >
              <Avatar className="h-10 w-10 ring-2 ring-blue-100">
                <AvatarImage
                  src={conv.partner?.avatar_url ?? undefined}
                  alt={conv.partner?.display_name ?? 'User'}
                />
                <AvatarFallback className="text-sm bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-medium">
                  {conv.partner?.display_name?.charAt(0).toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">
                    {conv.partner?.display_name ?? 'Unknown'}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {conv.last_message}
                </p>
              </div>

              {conv.unread_count > 0 && (
                <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] px-2 py-0.5 min-w-[22px] text-center border-0 shadow-sm shadow-pink-500/20 rounded-full font-bold">
                  {conv.unread_count}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Event Chats Section */}
      <div className="px-5 pt-5 pb-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200">
            <MessageCircle className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <span className="text-purple-900">Event Chats</span>
        </h2>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-100 via-indigo-100 to-pink-100 flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-purple-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-purple-900">No active event chats</p>
            <p className="text-xs text-muted-foreground mt-1">
              Join or create an event to start chatting 🎉
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-4 rounded-xl overflow-hidden section-purple-tint divide-y divide-purple-100/50">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/event/${event.id}?tab=chat`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50/50 transition-colors"
            >
              {/* Activity icon avatar with color */}
              <div className={`flex items-center justify-center h-12 w-12 rounded-xl text-xl ${getActivityIconCircleClass(event.activity_type)}`}>
                {getActivityIcon(event.activity_type)}
              </div>

              {/* Event info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{event.title}</span>
                  {event.is_now && new Date(event.starts_at) > new Date() && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] px-1.5 py-0 border-0 rounded-md">
                      ⚡ Soon
                    </Badge>
                  )}
                  {new Date(event.starts_at) < new Date() && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md border-gray-300 text-gray-400">
                      Ended
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.spots_taken}/{event.total_spots} people · {format(new Date(event.starts_at), 'MMM d, h:mm a')}
                </p>
              </div>

              {/* Chevron */}
              <svg className="h-4 w-4 text-purple-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
