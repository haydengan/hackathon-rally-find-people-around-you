'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Shield,
  Users,
  Dumbbell,
  Share2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParticipantList } from '@/components/ParticipantList';
import { ChatPanel } from '@/components/ChatPanel';
import { createClient } from '@/lib/supabase/client';
import { ACTIVITY_TYPES, SKILL_LEVELS, type Event, type Participant } from '@/types';

function getActivityGradient(activityType: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityType)) return 'from-rose-400 via-red-400 to-orange-400';
  if (fitnessTypes.includes(activityType)) return 'from-emerald-400 via-green-400 to-teal-400';
  if (socialTypes.includes(activityType)) return 'from-pink-400 via-rose-400 to-fuchsia-400';
  if (creativeTypes.includes(activityType)) return 'from-purple-400 via-violet-400 to-fuchsia-400';
  if (techTypes.includes(activityType)) return 'from-indigo-400 via-blue-400 to-violet-400';
  if (outdoorTypes.includes(activityType)) return 'from-teal-400 via-cyan-400 to-emerald-400';
  if (gamingTypes.includes(activityType)) return 'from-red-400 via-rose-400 to-pink-400';
  return 'from-indigo-400 via-purple-400 to-pink-400';
}

function getActivityBadgeClass(activityType: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityType)) return 'badge-sports';
  if (fitnessTypes.includes(activityType)) return 'badge-fitness';
  if (socialTypes.includes(activityType)) return 'badge-social';
  if (creativeTypes.includes(activityType)) return 'badge-creative';
  if (techTypes.includes(activityType)) return 'badge-tech';
  if (outdoorTypes.includes(activityType)) return 'badge-outdoor';
  if (gamingTypes.includes(activityType)) return 'badge-gaming';
  return 'badge-default';
}

export default function EventDetailPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Loading...</p></div>}>
      <EventDetailPage />
    </Suspense>
  );
}

function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const defaultTab = searchParams.get('tab') === 'chat' ? 'chat' : 'details';

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (res.ok) {
        const { data } = await res.json();
        setEvent(data);
      } else {
        const { error: msg } = await res.json();
        setError(msg || 'Event not found');
      }
    } catch {
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchWaitlist = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/waitlist`);
      if (res.ok) {
        const { data } = await res.json();
        setWaitlistCount(data.count);
        setIsOnWaitlist(data.is_on_waitlist);
      }
    } catch {
      // silently fail
    }
  }, [eventId]);

  // Fetch event and get user
  useEffect(() => {
    fetchEvent();
    fetchWaitlist();

    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    }
    getUser();
  }, [fetchEvent, fetchWaitlist]);

  // Subscribe to participant changes for real-time updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`event-participants:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Refetch event data when participants change
          fetchEvent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchEvent]);

  const isCreator = userId === event?.creator_id;
  const isParticipant = event?.participants?.some((p: Participant) => p.user_id === userId) ?? false;
  const spotsRemaining = event ? event.total_spots - event.spots_taken : 0;

  const handleJoin = async () => {
    setJoining(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/join`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error);
      } else {
        await fetchEvent();
      }
    } catch {
      setActionError('Failed to join event');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/leave`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error);
      } else {
        await fetchEvent();
        await fetchWaitlist();
      }
    } catch {
      setActionError('Failed to leave event');
    } finally {
      setLeaving(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setWaitlistLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/waitlist`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error);
      } else {
        setIsOnWaitlist(true);
        setWaitlistCount((prev) => prev + 1);
      }
    } catch {
      setActionError('Failed to join waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    setWaitlistLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/waitlist`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error);
      } else {
        setIsOnWaitlist(false);
        setWaitlistCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      setActionError('Failed to leave waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">{error || 'Event not found'}</p>
        <Button variant="outline" onClick={() => router.push('/map')}>
          Back to Map
        </Button>
      </div>
    );
  }

  const activityLabel =
    ACTIVITY_TYPES.find((a) => a.value === event.activity_type)?.label ?? event.activity_type;
  const skillLabel =
    SKILL_LEVELS.find((s) => s.value === event.skill_level)?.label ?? event.skill_level;
  const startsAt = new Date(event.starts_at);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Colorful header with activity gradient */}
      <div className={`sticky top-0 z-10 bg-gradient-to-r ${getActivityGradient(event.activity_type)} px-4 py-3 flex items-center gap-3 shadow-md`}>
        <Button variant="ghost" size="icon" onClick={() => router.push('/map')} className="text-white hover:bg-white/20">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg truncate flex-1 text-white">{event.title}</h1>
        {event.is_now && (
          <Badge className="bg-white/20 text-white border-white/30 shrink-0 backdrop-blur-sm">🔥 Urgent</Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={async () => {
            const url = `${window.location.origin}/event/${eventId}`;
            if (navigator.share) {
              try { await navigator.share({ title: event.title, text: `Join ${event.title} on Rally!`, url }); } catch {}
            } else {
              await navigator.clipboard.writeText(url);
              alert('Link copied!');
            }
          }}
          aria-label="Share event"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 w-auto bg-indigo-50 p-1">
          <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm font-semibold">Details</TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm font-semibold">Chat</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Activity & Skill badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getActivityBadgeClass(event.activity_type)}`}>
                {activityLabel}
              </span>
              <Badge variant="outline" className="rounded-full font-medium">{skillLabel}</Badge>
              <Badge
                variant="outline"
                className={
                  event.status === 'full'
                    ? 'border-red-300 text-red-700 bg-red-50 rounded-full'
                    : 'border-emerald-300 text-emerald-700 bg-emerald-50 rounded-full'
                }
              >
                {event.status === 'full' ? '🔴 Full' : '🟢 Active'}
              </Badge>
            </div>

            {/* Description */}
            {event.description && (
              <p className="text-sm text-muted-foreground bg-gray-50 rounded-xl p-3">{event.description}</p>
            )}

            {/* Info grid with colored icons */}
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="font-medium">{format(startsAt, 'EEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <span>
                  {format(startsAt, 'h:mm a')} <span className="text-muted-foreground">({formatDistanceToNow(startsAt, { addSuffix: true })})</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                </div>
                <span>{event.location_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <span>
                  <span className="font-semibold text-indigo-600">{event.participants?.length ?? event.spots_taken}/{event.total_spots}</span> joined ({event.total_spots - (event.participants?.length ?? event.spots_taken)} remaining)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-amber-100 to-amber-50">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </div>
                <span>{event.cost_per_person === 0 ? '✨ Free' : `$${event.cost_per_person}`}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-rose-100 to-rose-50">
                  <Dumbbell className="h-4 w-4 text-rose-600" />
                </div>
                <span>{skillLabel}</span>
              </div>
              </div>

            {/* Action buttons */}
            <div className="space-y-2">
              {actionError && (
                <p className="text-sm text-destructive text-center">{actionError}</p>
              )}

              {!isParticipant && !isCreator && event.status !== 'full' && (
                <Button
                  className="w-full btn-gradient border-0 rounded-xl h-12 text-base font-semibold"
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining
                    ? 'Joining...'
                    : `🚀 Join Event (${spotsRemaining} spots left)`}
                </Button>
              )}

              {!isParticipant && !isCreator && event.status === 'full' && !isOnWaitlist && (
                <Button
                  className="w-full rounded-xl h-12"
                  variant="secondary"
                  onClick={handleJoinWaitlist}
                  disabled={waitlistLoading}
                >
                  {waitlistLoading ? 'Joining Waitlist...' : '⏳ Join Waitlist'}
                </Button>
              )}

              {!isParticipant && !isCreator && isOnWaitlist && (
                <Button
                  className="w-full rounded-xl h-12"
                  variant="outline"
                  onClick={handleLeaveWaitlist}
                  disabled={waitlistLoading}
                >
                  {waitlistLoading ? 'Leaving Waitlist...' : 'Leave Waitlist'}
                </Button>
              )}

              {waitlistCount > 0 && (
                <p className="text-xs text-indigo-600 text-center font-medium">
                  ⏳ {waitlistCount} {waitlistCount === 1 ? 'person' : 'people'} waiting
                </p>
              )}

              {isParticipant && !isCreator && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-12 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleLeave}
                  disabled={leaving}
                >
                  {leaving ? 'Leaving...' : 'Leave Event'}
                </Button>
              )}

              {isCreator && (
                <div className="space-y-2">
                  <p className="text-sm text-indigo-600 text-center font-medium bg-indigo-50 rounded-xl py-3">
                    👑 You are the host of this event
                  </p>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-indigo-100">
                    <span className="text-xs font-medium text-muted-foreground">Max players:</span>
                    <input
                      type="number"
                      min={2}
                      max={50}
                      defaultValue={event.total_spots}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center focus:border-indigo-300 outline-none"
                      onBlur={async (e) => {
                        const newSpots = Math.max(2, Math.min(50, Number(e.target.value)));
                        if (newSpots !== event.total_spots) {
                          await fetch(`/api/events/${eventId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ total_spots: newSpots }),
                          });
                          fetchEvent();
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">people</span>
                  </div>
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span>👥</span> Participants ({event.participants?.length ?? 0})
              </h3>
              <ParticipantList
                participants={event.participants ?? []}
                creatorId={event.creator_id}
              />
            </div>
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1">
          {isParticipant || isCreator ? (
            userId && <ChatPanel eventId={eventId} userId={userId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Join this event to access the chat
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
