'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ACTIVITY_TYPES } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AvailabilitySlot {
  id: string;
  activity_type: string;
  day_of_week: number;
  time_slot: string;
}

interface Profile {
  preferred_activities: string[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['morning', 'afternoon', 'evening'] as const;
const TIME_LABELS: Record<string, string> = {
  morning: '🌅 Morning',
  afternoon: '☀️ Afternoon',
  evening: '🌙 Evening',
};

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);
  const [matchResult, setMatchResult] = useState<string | null>(null);

  async function fetchData() {
    try {
      const [slotsRes, profileRes] = await Promise.all([
        fetch('/api/availability'),
        fetch('/api/profile'),
      ]);

      if (slotsRes.ok) {
        const { data } = await slotsRes.json();
        setSlots(data ?? []);
      }

      if (profileRes.ok) {
        const { data } = await profileRes.json();
        setProfile(data);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function isSlotActive(activityType: string, dayOfWeek: number, timeSlot: string): boolean {
    return slots.some(
      (s) =>
        s.activity_type === activityType &&
        s.day_of_week === dayOfWeek &&
        s.time_slot === timeSlot
    );
  }

  function getSlotId(activityType: string, dayOfWeek: number, timeSlot: string): string | undefined {
    return slots.find(
      (s) =>
        s.activity_type === activityType &&
        s.day_of_week === dayOfWeek &&
        s.time_slot === timeSlot
    )?.id;
  }

  async function toggleSlot(activityType: string, dayOfWeek: number, timeSlot: string) {
    const key = `${activityType}-${dayOfWeek}-${timeSlot}`;
    setToggling(key);

    const existingId = getSlotId(activityType, dayOfWeek, timeSlot);

    try {
      if (existingId) {
        // Remove slot
        const res = await fetch('/api/availability', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingId }),
        });

        if (res.ok) {
          setSlots((prev) => prev.filter((s) => s.id !== existingId));
        } else {
          toast.error('Failed to remove slot');
        }
      } else {
        // Add slot
        const res = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_type: activityType,
            day_of_week: dayOfWeek,
            time_slot: timeSlot,
          }),
        });

        if (res.ok) {
          const { data } = await res.json();
          setSlots((prev) => [...prev, data]);
        } else {
          toast.error('Failed to add slot');
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setToggling(null);
    }
  }

  async function handleFindMatches() {
    setFinding(true);
    setMatchResult(null);

    try {
      const res = await fetch('/api/invitations/suggest', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        const count = data.data?.length ?? 0;
        if (count > 0) {
          setMatchResult(`Found ${count} match${count === 1 ? '' : 'es'}! Check your invitations.`);
          toast.success(`Found ${count} match${count === 1 ? '' : 'es'}!`);
        } else {
          setMatchResult('No matches found. Try adding more availability slots.');
        }
      } else {
        toast.error(data.error || 'Failed to find matches');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setFinding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  const activities = profile?.preferred_activities ?? [];

  return (
    <div className="mx-auto max-w-md p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold">My Availability</h1>
        </div>
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No preferred activities set. Update your profile first.
          </p>
          <Link href="/profile">
            <Button variant="outline" className="mt-4 rounded-xl">
              Go to Profile
            </Button>
          </Link>
        </div>
      )}

      {/* Activity Grids */}
      <div className="space-y-6">
        {activities.map((activityValue) => {
          const activity = ACTIVITY_TYPES.find((a) => a.value === activityValue);
          const label = activity?.label ?? activityValue;
          const emoji = activity?.icon ?? '✨';

          return (
            <div
              key={activityValue}
              className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{emoji}</span>
                <h2 className="text-sm font-semibold">
                  {label.replace(`${emoji} `, '')}
                </h2>
                <Badge variant="outline" className="ml-auto text-[10px] rounded-full">
                  {slots.filter((s) => s.activity_type === activityValue).length} slots
                </Badge>
              </div>

              {/* Grid: Days x Time Slots */}
              <div className="overflow-x-auto">
                <table className="w-full text-center">
                  <thead>
                    <tr>
                      <th className="text-[10px] text-muted-foreground font-medium p-1" />
                      {DAYS.map((day) => (
                        <th
                          key={day}
                          className="text-[10px] text-muted-foreground font-medium p-1"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((timeSlot) => (
                      <tr key={timeSlot}>
                        <td className="text-[10px] text-muted-foreground font-medium p-1 whitespace-nowrap text-left">
                          {TIME_LABELS[timeSlot]}
                        </td>
                        {DAYS.map((_, dayIndex) => {
                          const active = isSlotActive(activityValue, dayIndex, timeSlot);
                          const key = `${activityValue}-${dayIndex}-${timeSlot}`;
                          const isToggling = toggling === key;

                          return (
                            <td key={dayIndex} className="p-1">
                              <button
                                onClick={() => toggleSlot(activityValue, dayIndex, timeSlot)}
                                disabled={isToggling}
                                className={cn(
                                  'w-8 h-8 rounded-lg transition-all text-xs font-medium',
                                  'hover:scale-105 active:scale-95',
                                  active
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm shadow-indigo-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                                  isToggling && 'opacity-50'
                                )}
                                aria-label={`${active ? 'Remove' : 'Add'} ${timeSlot} on ${DAYS[dayIndex]} for ${label}`}
                              >
                                {isToggling ? '…' : active ? '✓' : ''}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Find Matches Button */}
      {activities.length > 0 && (
        <div className="mt-8 space-y-3">
          <Button
            className="w-full btn-gradient border-0 rounded-xl h-12 text-base font-semibold"
            onClick={handleFindMatches}
            disabled={finding || slots.length === 0}
          >
            {finding ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Finding Matches...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Find Matches
              </>
            )}
          </Button>

          {slots.length === 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Toggle at least one availability slot to find matches
            </p>
          )}

          {matchResult && (
            <div className="text-center p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <p className="text-sm font-medium text-indigo-700">{matchResult}</p>
              {matchResult.includes('Found') && (
                <Link
                  href="/invitations"
                  className="text-xs text-indigo-600 font-medium hover:underline mt-1 inline-block"
                >
                  View Invitations →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
