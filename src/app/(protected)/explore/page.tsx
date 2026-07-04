'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
} from 'date-fns';
import { Clock, MapPin, Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CountdownTimer } from '@/components/CountdownTimer';
import { EventForm } from '@/components/EventForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGeolocation } from '@/hooks/useGeolocation';
import { calculateDistance, formatDistance } from '@/lib/geo';
import { ACTIVITY_TYPES, SKILL_LEVELS, type Event } from '@/types';
import { cn } from '@/lib/utils';

function getActivityBgClass(activityType: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityType)) return 'activity-bg-sports';
  if (fitnessTypes.includes(activityType)) return 'activity-bg-fitness';
  if (socialTypes.includes(activityType)) return 'activity-bg-social';
  if (creativeTypes.includes(activityType)) return 'activity-bg-creative';
  if (techTypes.includes(activityType)) return 'activity-bg-tech';
  if (outdoorTypes.includes(activityType)) return 'activity-bg-outdoor';
  if (gamingTypes.includes(activityType)) return 'activity-bg-gaming';
  return 'activity-bg-default';
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

export default function ExplorePage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const { location: userLocation } = useGeolocation();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events?include_past=true');
      if (res.ok) {
        const { data } = await res.json();
        setEvents(data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Count events per day for the heatmap
  function getEventCountForDay(day: Date): number {
    return events.filter((e) => isSameDay(new Date(e.starts_at), day)).length;
  }

  // Get heatmap color based on event count
  function getHeatColor(count: number): string {
    if (count === 0) return '';
    if (count === 1) return 'bg-indigo-100 text-indigo-900';
    if (count === 2) return 'bg-indigo-200 text-indigo-900';
    if (count <= 4) return 'bg-indigo-300 text-indigo-900';
    return 'bg-indigo-500 text-white';
  }

  // Filter events for selected day
  const dayEvents = events.filter((e) => isSameDay(new Date(e.starts_at), selectedDate));

  // Sort: urgent first, then by time
  const sortedEvents = [...dayEvents].sort((a, b) => {
    if (a.is_now && !b.is_now) return -1;
    if (!a.is_now && b.is_now) return 1;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });

  // Generate calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header with gradient — full width breakout */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 backdrop-blur-xl border-b border-indigo-100/50 px-5 py-4 flex items-center justify-between -mx-[calc((100vw-100%)/2)] px-[calc((100vw-100%)/2+1.25rem)]">
        <h1 className="font-bold text-xl text-gradient">Explore Events</h1>
        <Button
          size="icon"
          className="h-9 w-9 rounded-xl btn-gradient border-0"
          onClick={() => setCreateOpen(true)}
          aria-label="Create event"
        >
          <Plus className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Calendar with soft gradient background */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-b from-indigo-50/30 to-transparent">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-9 w-9 rounded-xl hover:bg-indigo-100"
          >
            <ChevronLeft className="h-4 w-4 text-indigo-600" />
          </Button>
          <span className="text-sm font-bold text-indigo-900">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-9 w-9 rounded-xl hover:bg-indigo-100"
          >
            <ChevronRight className="h-4 w-4 text-indigo-600" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-indigo-400 py-1 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((calDay, i) => {
            const isSelected = isSameDay(calDay, selectedDate);
            const isCurrentMonth = isSameMonth(calDay, currentMonth);
            const isTodayDay = isSameDay(calDay, new Date());
            const eventCount = getEventCountForDay(calDay);
            const heatColor = getHeatColor(eventCount);

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(calDay)}
                className={cn(
                  'relative flex flex-col items-center justify-center h-11 rounded-xl text-sm transition-all',
                  !isCurrentMonth && 'opacity-30',
                  isSelected && 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/30 scale-105',
                  !isSelected && isTodayDay && 'font-bold ring-2 ring-indigo-300 ring-offset-1',
                  !isSelected && heatColor,
                  !isSelected && !heatColor && 'hover:bg-indigo-50'
                )}
              >
                <span className={cn(
                  'text-xs',
                  isSelected && 'font-bold text-white'
                )}>
                  {format(calDay, 'd')}
                </span>
                {eventCount > 0 && !isSelected && (
                  <span className="absolute bottom-0.5 text-[8px] font-bold text-indigo-600">
                    {eventCount}
                  </span>
                )}
                {eventCount > 0 && isSelected && (
                  <span className="absolute bottom-0.5 text-[8px] font-bold text-white/80">
                    {eventCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 justify-center">
          <span className="text-[10px] text-muted-foreground font-medium">Less</span>
          <div className="flex gap-0.5">
            <div className="h-3 w-3 rounded-sm bg-indigo-100" />
            <div className="h-3 w-3 rounded-sm bg-indigo-200" />
            <div className="h-3 w-3 rounded-sm bg-indigo-300" />
            <div className="h-3 w-3 rounded-sm bg-indigo-500" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">More events</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />

      {/* Event list for selected day */}
      <div className="flex-1 px-5 pb-20 space-y-3 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-2xl border-gray-100">
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-lg" />
                    <Skeleton className="h-6 w-16 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center mb-4">
              <span className="text-4xl">📅</span>
            </div>
            <p className="font-bold text-base text-indigo-900">No events on {format(selectedDate, 'MMM d')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try another day or create your own! 🚀
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-indigo-600 font-semibold text-center">
              {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''} on {format(selectedDate, 'MMM d')}
            </p>
            {sortedEvents.map((event) => {
              const distance = userLocation && event.location
                ? calculateDistance(userLocation, event.location)
                : undefined;
              return <ExploreEventCard key={event.id} event={event} distanceKm={distance} />;
            })}
          </>
        )}
      </div>

      {/* Create Event Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <SheetTitle>Create Event</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(90vh-60px)]">
            <div className="px-4 py-4 pb-8">
              <EventForm
                defaultLocation={userLocation}
                onSuccess={() => {
                  setCreateOpen(false);
                  fetchEvents();
                }}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ExploreEventCard({ event, distanceKm }: { event: Event; distanceKm?: number }) {
  const activity = ACTIVITY_TYPES.find((a) => a.value === event.activity_type);
  const skill = SKILL_LEVELS.find((s) => s.value === event.skill_level);
  const spotsLeft = event.total_spots - event.spots_taken;
  const startsAt = new Date(event.starts_at);
  const now = Date.now();
  const startMs = startsAt.getTime();
  const endMs = event.ends_at ? new Date(event.ends_at).getTime() : startMs + 2 * 60 * 60 * 1000;
  const isLive = now >= startMs && now <= endMs;
  const isStartingSoon = !isLive && startMs > now && startMs <= now + 60 * 60 * 1000;
  const isPast = now > endMs;

  return (
    <Link href={`/event/${event.id}`}>
      <Card className={cn(
        'card-hover rounded-2xl overflow-hidden border-0 shadow-sm',
        isLive ? 'bg-gradient-to-r from-red-100 to-rose-100 ring-1 ring-red-200' :
        isStartingSoon ? 'bg-gradient-to-r from-amber-50 to-orange-50 ring-1 ring-amber-200' :
        isPast ? 'opacity-60 bg-gray-100' :
        getActivityBgClass(event.activity_type)
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Activity icon with colored circle */}
            <div className={cn(
              'flex items-center justify-center h-12 w-12 rounded-xl text-xl shrink-0 shadow-sm',
              isLive ? 'bg-red-200' : isStartingSoon ? 'bg-amber-100' : getActivityIconCircleClass(event.activity_type)
            )}>
              {activity?.icon ?? '📍'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm truncate">{event.title}</h3>
                {isLive && (
                  <Badge className="bg-red-500 text-white text-[9px] px-1.5 py-0 shrink-0 border-0 rounded-md animate-pulse">
                    🔴 Live
                  </Badge>
                )}
                {isStartingSoon && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] px-1.5 py-0 shrink-0 border-0 rounded-md">
                    ⚡ Starting Soon
                  </Badge>
                )}
                {isPast && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 rounded-md border-gray-300 text-gray-400">
                    Ended
                  </Badge>
                )}
              </div>

              {/* Time + Location */}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-indigo-400" />
                  {format(startsAt, 'h:mm a')}
                  {isLive && (
                    <span className="font-medium text-red-500 ml-0.5">· Live</span>
                  )}
                  {isStartingSoon && (
                    <span className="font-medium text-amber-600 ml-0.5">
                      · <CountdownTimer targetDate={event.starts_at} />
                    </span>
                  )}
                  {isPast && (
                    <span className="text-gray-400 ml-0.5">· Ended</span>
                  )}
                </span>
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0 text-emerald-400" />
                  <span className="truncate">{event.location_name}</span>
                  {distanceKm !== undefined && (
                    <span className="flex items-center gap-0.5 shrink-0 text-indigo-600 font-semibold">
                      · {formatDistance(distanceKm)}
                    </span>
                  )}
                </span>
              </div>

              {/* Tags + Need */}
              <div className="flex items-center gap-2 mt-2.5">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-gray-700 border border-gray-200 font-medium">
                  {skill?.label ?? 'Any'}
                </Badge>
                {event.cost_per_person === 0 ? (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full border-emerald-300 text-emerald-700 bg-emerald-50 font-medium">
                    ✨ Free
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-medium">
                    ${event.cost_per_person}
                  </Badge>
                )}
                <span className={cn(
                  "text-[10px] ml-auto flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-full",
                  spotsLeft > 0
                    ? 'text-indigo-700 bg-indigo-100'
                    : 'text-gray-500 bg-gray-100'
                )}>
                  <Users className="h-3 w-3" />
                  {spotsLeft > 0 ? `Need ${spotsLeft}` : 'Full'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
