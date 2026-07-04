'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACTIVITY_TYPES } from '@/types';

interface HistoryEvent {
  id: string;
  creator_id: string;
  title: string;
  activity_type: string;
  skill_level: string;
  location_name: string;
  starts_at: string;
  total_spots: number;
  spots_taken: number;
  cost_per_person: number;
  is_now: boolean;
  status: string;
  role: 'creator' | 'participant';
  attended?: boolean;
}

interface Stats {
  totalJoined: number;
  totalCreated: number;
  mostFrequentActivity: string;
}

export default function HistoryPage() {
  const [tab, setTab] = useState<'joined' | 'created'>('joined');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [joinedEvents, setJoinedEvents] = useState<HistoryEvent[]>([]);
  const [createdEvents, setCreatedEvents] = useState<HistoryEvent[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalJoined: 0,
    totalCreated: 0,
    mostFrequentActivity: '',
  });
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async (currentTab: string, activity: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: currentTab, limit: '50' });
      if (activity && activity !== 'all') {
        params.set('activity_type', activity);
      }

      const res = await fetch(`/api/history?${params.toString()}`);
      if (res.ok) {
        const { data } = await res.json();
        if (currentTab === 'joined') {
          setJoinedEvents(data);
        } else {
          setCreatedEvents(data);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch both tabs for stats on mount
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [joinedRes, createdRes] = await Promise.all([
          fetch('/api/history?tab=joined&limit=50'),
          fetch('/api/history?tab=created&limit=50'),
        ]);

        if (joinedRes.ok) {
          const { data, total } = await joinedRes.json();
          setJoinedEvents(data);
          setStats((prev) => ({ ...prev, totalJoined: total }));
        }

        if (createdRes.ok) {
          const { data, total } = await createdRes.json();
          setCreatedEvents(data);
          setStats((prev) => ({ ...prev, totalCreated: total }));
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Calculate most frequent activity from joined events
  useEffect(() => {
    const allEvents = [...joinedEvents, ...createdEvents];
    if (allEvents.length === 0) {
      setStats((prev) => ({ ...prev, mostFrequentActivity: '' }));
      return;
    }

    const counts: Record<string, number> = {};
    allEvents.forEach((e) => {
      counts[e.activity_type] = (counts[e.activity_type] || 0) + 1;
    });

    const topActivity = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '';
    setStats((prev) => ({ ...prev, mostFrequentActivity: topActivity }));
  }, [joinedEvents, createdEvents]);

  const handleTabChange = (value: string) => {
    const newTab = value as 'joined' | 'created';
    setTab(newTab);
    fetchHistory(newTab, activityFilter);
  };

  const handleFilterChange = (value: string | null) => {
    const filterValue = value ?? 'all';
    setActivityFilter(filterValue);
    fetchHistory(tab, filterValue);
  };

  const getActivityLabel = (value: string) => {
    return ACTIVITY_TYPES.find((a) => a.value === value)?.label ?? value;
  };

  const getActivityIcon = (value: string) => {
    return ACTIVITY_TYPES.find((a) => a.value === value)?.icon ?? '✨';
  };

  const currentEvents = tab === 'joined' ? joinedEvents : createdEvents;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <h1 className="font-semibold text-lg">Event History</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-rally-primary">{stats.totalJoined}</p>
              <p className="text-[10px] text-muted-foreground">Joined</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-rally-primary">{stats.totalCreated}</p>
              <p className="text-[10px] text-muted-foreground">Created</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">
                {stats.mostFrequentActivity
                  ? getActivityIcon(stats.mostFrequentActivity)
                  : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">Top Activity</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Select value={activityFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            {ACTIVITY_TYPES.map((activity) => (
              <SelectItem key={activity.value} value={activity.value}>
                {activity.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="joined" className="flex-1">
              Joined
            </TabsTrigger>
            <TabsTrigger value="created" className="flex-1">
              Created
            </TabsTrigger>
          </TabsList>

          <TabsContent value="joined" className="mt-4 space-y-3">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
            ) : currentEvents.length === 0 ? (
              <EmptyState type="joined" />
            ) : (
              currentEvents.map((event) => (
                <HistoryCard key={event.id} event={event} getActivityLabel={getActivityLabel} />
              ))
            )}
          </TabsContent>

          <TabsContent value="created" className="mt-4 space-y-3">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
            ) : currentEvents.length === 0 ? (
              <EmptyState type="created" />
            ) : (
              currentEvents.map((event) => (
                <HistoryCard key={event.id} event={event} getActivityLabel={getActivityLabel} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function HistoryCard({
  event,
  getActivityLabel,
}: {
  event: HistoryEvent;
  getActivityLabel: (value: string) => string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{event.title}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {getActivityLabel(event.activity_type)}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {event.role === 'creator' ? 'Hosted' : 'Joined'}
              </Badge>
              {event.attended === true && (
                <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">
                  <Trophy className="h-3 w-3 mr-0.5" />
                  Attended
                </Badge>
              )}
              {event.attended === false && (
                <Badge className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100">
                  No-show
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(event.starts_at), 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {event.location_name}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {event.spots_taken}/{event.total_spots}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ type }: { type: 'joined' | 'created' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3">{type === 'joined' ? '🎯' : '🎨'}</div>
      <p className="text-sm font-medium">No events yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        {type === 'joined'
          ? 'Events you join will appear here after they end'
          : 'Events you create will appear here after they end'}
      </p>
    </div>
  );
}
