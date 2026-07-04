'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { isSameDay, format } from 'date-fns';
import { Loader2, Plus, X, Check, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACTIVITY_TYPES } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { calculateDistance, formatDistance } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AvailabilitySlot {
  id: string;
  activity_type: string;
  day_of_week: number;
  time_slot: string;
}

interface Invitation {
  id: string;
  event_id: string | null;
  inviter_id: string | null;
  type: 'manual' | 'auto_suggest';
  status: 'pending' | 'accepted' | 'declined';
  message: string | null;
  suggested_location: string | null;
  suggested_activity: string | null;
  suggested_time: string | null;
  created_at: string;
  inviter: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    reputation_score: number;
  } | null;
  event: {
    id: string;
    title: string;
    activity_type: string;
    location_name: string;
    starts_at: string;
    total_spots: number;
    spots_taken: number;
  } | null;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23
const HOUR_LABELS: Record<number, string> = {
  0: '12am', 1: '1am', 2: '2am', 3: '3am', 4: '4am', 5: '5am',
  6: '6am', 7: '7am', 8: '8am', 9: '9am', 10: '10am', 11: '11am',
  12: '12pm', 13: '1pm', 14: '2pm', 15: '3pm', 16: '4pm', 17: '5pm',
  18: '6pm', 19: '7pm', 20: '8pm', 21: '9pm', 22: '10pm', 23: '11pm',
};
// Keep old labels for display of existing data
const TIME_LABELS: Record<string, string> = {
  morning: '8am–12pm',
  afternoon: '12–5pm',
  evening: '5–10pm',
  ...Object.fromEntries(HOURS.map((h) => [String(h), HOUR_LABELS[h]])),
};

function getActivityEmoji(activityType: string): string {
  return ACTIVITY_TYPES.find((a) => a.value === activityType)?.icon ?? '✨';
}

function getActivityLabel(activityType: string): string {
  const a = ACTIVITY_TYPES.find((a) => a.value === activityType);
  return a ? a.label.replace(a.icon + ' ', '') : activityType;
}

export default function AvailabilityMatchPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; activity_type: string; starts_at: string; ends_at?: string; location_lat?: number; location_lng?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const { location: userLocation } = useGeolocation();

  const fetchData = useCallback(async () => {
    try {
      const [slotsRes, invRes, eventsRes] = await Promise.all([
        fetch('/api/availability'),
        fetch('/api/invitations'),
        fetch('/api/events?include_past=true'),
      ]);
      if (slotsRes.ok) {
        const { data } = await slotsRes.json();
        setSlots(data ?? []);
      }
      if (invRes.ok) {
        const { data } = await invRes.json();
        setInvitations(data ?? []);
      }
      if (eventsRes.ok) {
        const { data } = await eventsRes.json();
        setEvents(data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group slots by activity type for card display
  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.activity_type]) acc[slot.activity_type] = [];
    acc[slot.activity_type].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  async function handleDeleteSlots(activityType: string) {
    const toDelete = slots.filter((s) => s.activity_type === activityType);
    for (const slot of toDelete) {
      await fetch('/api/availability', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slot.id }),
      });
    }
    setSlots((prev) => prev.filter((s) => s.activity_type !== activityType));
    toast.success('Removed');
  }

  async function handleRespond(id: string, status: 'accepted' | 'declined') {
    setRespondingId(id);
    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === 'accepted' ? 'Accepted!' : 'Declined');
        setInvitations((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)));
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRespondingId(null);
    }
  }

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-14">
      {/* Header — only on this page */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-5 py-3 flex items-center justify-center">
        <h1 className="font-black text-xl tracking-tight text-gradient">Rally</h1>
      </div>

      {/* Community broadcast — what's happening today */}
      <div className="px-4 pt-3 pb-2">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4 shadow-lg shadow-indigo-500/20">
          <p className="text-white/80 text-[10px] font-medium uppercase tracking-wider mb-1">Happening around you</p>
          {(() => {
            const now = Date.now();
            const todayActive = events.filter((e) => {
              const start = new Date(e.starts_at).getTime();
              const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 2 * 60 * 60 * 1000;
              return isSameDay(new Date(e.starts_at), new Date()) && now <= end;
            });
            return (
              <>
                <p className="text-white font-semibold text-sm">
                  {todayActive.length > 0
                    ? `${todayActive.length} event${todayActive.length !== 1 ? 's' : ''} today nearby`
                    : 'No events today — set your availability!'}
                </p>
                {todayActive.length > 0 && (
                  <div className="flex gap-1.5 mt-2 overflow-x-auto">
                    {todayActive.slice(0, 5).map((e) => {
                      const time = format(new Date(e.starts_at), 'h:mma').toLowerCase();
                      const dist = userLocation && e.location_lat && e.location_lng
                        ? formatDistance(calculateDistance(userLocation, { lat: e.location_lat, lng: e.location_lng }))
                        : '';
                      return (
                        <span key={e.id} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full whitespace-nowrap backdrop-blur-sm">
                          {getActivityEmoji(e.activity_type)} {e.activity_type} · {time}{dist ? ` · ${dist}` : ''}
                        </span>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Availability Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">My Availability</h2>
          </div>

          {/* Cards grid */}
          {Object.keys(groupedSlots).length === 0 ? (
            <div className="text-center py-10 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30">
              <Sparkles className="h-8 w-8 mx-auto text-indigo-300 mb-3" />
              <p className="text-sm font-medium">No availability set yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first activity to start getting matched</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(groupedSlots).map(([activityType, actSlots]) => {
                // Group by day and sort times numerically
                const daySlots = actSlots.reduce((acc, s) => {
                  const dayLabel = DAYS[s.day_of_week];
                  if (!acc[dayLabel]) acc[dayLabel] = [];
                  acc[dayLabel].push(s.time_slot);
                  return acc;
                }, {} as Record<string, string[]>);

                // Sort times within each day
                Object.keys(daySlots).forEach((day) => {
                  daySlots[day].sort((a, b) => {
                    const numA = parseInt(a) || 0;
                    const numB = parseInt(b) || 0;
                    return numA - numB;
                  });
                });

                // Sort days in correct order
                const sortedDays = Object.entries(daySlots).sort(
                  ([a], [b]) => DAYS.indexOf(a) - DAYS.indexOf(b)
                );

                // Get max_travel_km and min_people from first slot
                const firstSlot = actSlots[0] as AvailabilitySlot & { max_travel_km?: number; min_people?: number };
                const travelKm = firstSlot?.max_travel_km ?? 5;
                const minPpl = firstSlot?.min_people ?? 2;

                return (
                  <div
                    key={activityType}
                    className="relative rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
                    onClick={() => {
                      setEditingActivity(activityType);
                      setAddOpen(true);
                    }}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSlots(activityType); }}
                      className="absolute top-2 right-2 h-5 w-5 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                    </button>

                    {/* Activity */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{getActivityEmoji(activityType)}</span>
                      <span className="text-xs font-semibold truncate">{getActivityLabel(activityType)}</span>
                    </div>

                    {/* Min people + distance + recurrence */}
                    <div className="flex items-center gap-2 mb-2 text-[9px] text-muted-foreground">
                      <span>👥 {minPpl}+ ppl</span>
                      <span>📍 {travelKm}km</span>
                      <span className="ml-auto px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                        {(firstSlot as AvailabilitySlot & { recurrence?: string })?.recurrence === 'weekly' ? '🔁 Weekly' :
                         (firstSlot as AvailabilitySlot & { recurrence?: string })?.recurrence === 'specific' ? '📅 Specific' : '📆 This week'}
                      </span>
                    </div>

                    {/* Schedule summary — sorted */}
                    <div className="space-y-1">
                      {sortedDays.map(([day, times]) => (
                        <div key={day} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-indigo-600 w-7">{day}</span>
                          <div className="flex gap-0.5 flex-wrap">
                            {times.map((t) => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                                {TIME_LABELS[t] ?? t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add More button */}
          <Button
            variant="outline"
            className="w-full rounded-xl border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>

        {/* Invitations Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-600" />
            Invitations
            {pendingInvitations.length > 0 && (
              <Badge className="bg-pink-500 text-white border-0 text-[10px] px-1.5 rounded-full">
                {pendingInvitations.length}
              </Badge>
            )}
          </h2>

          {invitations.length === 0 ? (
            <div className="text-center py-8 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/30">
              <Mail className="h-6 w-6 mx-auto text-purple-300 mb-2" />
              <p className="text-xs text-muted-foreground">Invitations will appear here once you get matched</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <InvitationRow key={inv.id} invitation={inv} onRespond={handleRespond} respondingId={respondingId} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Activity Sheet */}
      <AddActivitySheet
        open={addOpen}
        onOpenChange={(open) => { setAddOpen(open); if (!open) setEditingActivity(null); }}
        existingSlots={slots}
        editingActivity={editingActivity}
        onSave={(newSlots) => {
          setSlots((prev) => [...prev, ...newSlots]);
          setAddOpen(false);
          fetchData(); // Refresh data
        }}
      />
    </div>
  );
}

// ---- Add Activity Sheet (When2Meet style) ----

function AddActivitySheet({
  open,
  onOpenChange,
  existingSlots,
  editingActivity,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSlots: AvailabilitySlot[];
  editingActivity: string | null;
  onSave: (slots: AvailabilitySlot[]) => void;
}) {
  const [activityType, setActivityType] = useState('');
  const [mode, setMode] = useState<'onetime' | 'weekly' | 'specific'>('onetime');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [specificDate, setSpecificDate] = useState('');
  const [maxTravelKm, setMaxTravelKm] = useState(5);
  const [minPeople, setMinPeople] = useState(2);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');

  // Pre-fill when editing
  useEffect(() => {
    if (editingActivity && open) {
      setActivityType(editingActivity);
      // Pre-select existing slots for this activity
      const existing = existingSlots.filter((s) => s.activity_type === editingActivity);
      const preSelected = new Set(existing.map((s) => `${s.day_of_week}-${s.time_slot}`));
      setSelected(preSelected);
      // Get travel/people from first slot
      const first = existing[0] as AvailabilitySlot & { max_travel_km?: number; min_people?: number };
      if (first?.max_travel_km) setMaxTravelKm(first.max_travel_km);
      if (first?.min_people) setMinPeople(first.min_people);
    } else if (!open) {
      setActivityType('');
      setSelected(new Set());
      setSpecificDate('');
    }
  }, [editingActivity, open, existingSlots]);

  function getKey(day: number, time: string) {
    return `${day}-${time}`;
  }

  function handlePointerDown(day: number, time: string) {
    const key = getKey(day, time);
    const isSelected = selected.has(key);
    setIsDragging(true);
    setDragMode(isSelected ? 'remove' : 'add');
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handlePointerEnter(day: number, time: string) {
    if (!isDragging) return;
    const key = getKey(day, time);
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode === 'add') next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  async function handleSave() {
    if (!activityType) {
      toast.error('Select an activity');
      return;
    }

    if (selected.size === 0) {
      toast.error('Select at least one time slot');
      return;
    }

    setSaving(true);
    const created: AvailabilitySlot[] = [];
    const recurrenceValue = mode === 'weekly' ? 'weekly' : mode === 'specific' ? 'specific' : 'this_week';
    if (mode === 'specific') {
      const date = new Date(specificDate);
      const jsDay = date.getDay();
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

      for (const key of selected) {
        const [, timeSlot] = key.split('-');
        const exists = existingSlots.some(
          (s) => s.activity_type === activityType && s.day_of_week === dayOfWeek && s.time_slot === timeSlot
        );
        if (exists) continue;

        try {
          const res = await fetch('/api/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity_type: activityType, day_of_week: dayOfWeek, time_slot: timeSlot, max_travel_km: maxTravelKm, min_people: minPeople, recurrence: recurrenceValue }),
          });
          if (res.ok) {
            const { data } = await res.json();
            created.push(data);
          }
        } catch { /* continue */ }
      }
    } else {
      for (const key of selected) {
        const [dayStr, timeSlot] = key.split('-');
        const dayOfWeek = parseInt(dayStr);

        const exists = existingSlots.some(
          (s) => s.activity_type === activityType && s.day_of_week === dayOfWeek && s.time_slot === timeSlot
        );
        if (exists) continue;

        try {
          const res = await fetch('/api/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity_type: activityType, day_of_week: dayOfWeek, time_slot: timeSlot, max_travel_km: maxTravelKm, min_people: minPeople, recurrence: recurrenceValue }),
          });
          if (res.ok) {
            const { data } = await res.json();
            created.push(data);
          }
        } catch { /* continue */ }
      }
    }

    setSaving(false);
    toast.success(created.length > 0 ? `Added! We'll find you matches.` : 'Already set for that time.');
    setActivityType('');
    setSelected(new Set());
    setSpecificDate('');
    onSave(created);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl" onPointerUp={handlePointerUp}>
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle>Add Availability</SheetTitle>
        </SheetHeader>

        <div className="px-4 py-4 space-y-5 overflow-y-auto h-[calc(85vh-120px)]">
          {/* Activity picker */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Activity</label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v ?? '')}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="What do you want to do?" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Travel distance + Min people */}
          {activityType && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Max travel</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxTravelKm}
                    onChange={(e) => setMaxTravelKm(Math.max(1, Math.min(50, Number(e.target.value) || 5)))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm pr-10 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">km</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Min people</label>
                <div className="relative">
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={minPeople}
                    onChange={(e) => setMinPeople(Math.max(2, Math.min(20, Number(e.target.value) || 2)))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm pr-14 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ppl</span>
                </div>
              </div>
            </div>
          )}

          {/* One-time vs Weekly toggle */}
          {activityType && (
            <div className="space-y-4">
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => { setMode('specific'); setSelected(new Set()); }}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
                    mode === 'specific' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500'
                  )}
                >
                  Specific date
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('onetime'); setSelected(new Set()); }}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
                    mode === 'onetime' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500'
                  )}
                >
                  This week
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('weekly'); setSelected(new Set()); }}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
                    mode === 'weekly' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500'
                  )}
                >
                  Every week
                </button>
              </div>

              {/* Specific date mode: pick a date then select hours in same grid format */}
              {mode === 'specific' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Pick a date</label>
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => { setSpecificDate(e.target.value); setSelected(new Set()); }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                  {specificDate && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">Select hours</label>
                      <div className="rounded-xl border border-indigo-100 bg-white p-2 max-h-[35vh] overflow-y-auto select-none">
                        <div className="grid grid-cols-6 gap-1">
                          {HOURS.map((hour) => {
                            const key = `0-${hour}`;
                            const isSelected = selected.has(key);
                            return (
                              <button
                                key={hour}
                                type="button"
                                onClick={() => {
                                  setSelected((prev) => {
                                    const next = new Set(prev);
                                    if (isSelected) next.delete(key);
                                    else next.add(key);
                                    return next;
                                  });
                                }}
                                className={cn(
                                  'h-8 rounded text-[10px] font-medium transition-all',
                                  isSelected
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-indigo-100'
                                )}
                              >
                                {HOUR_LABELS[hour]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">
                        {selected.size} hour{selected.size !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Grid for "Next 20 days" and "Every week" modes */}
              {(mode === 'onetime' || mode === 'weekly') && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    {mode === 'onetime' ? 'This week (tap to select)' : 'Every week (tap to select)'}
                  </label>
                  <div className="rounded-xl border border-indigo-100 bg-white p-2 max-h-[45vh] overflow-auto select-none touch-none">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr>
                          <th className="text-[9px] text-muted-foreground p-0.5 w-10 sticky left-0 bg-white" />
                          {DAYS.map((day, i) => {
                            const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                            const isPastDay = mode === 'onetime' && i < todayDow;
                            return (
                              <th key={day} className={cn(
                                "text-[9px] font-semibold p-0.5 text-center min-w-[32px]",
                                isPastDay ? 'text-gray-300' : 'text-muted-foreground'
                              )}>
                                {day}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {HOURS.map((hour) => (
                          <tr key={hour}>
                            <td className="text-[9px] text-muted-foreground font-medium p-0.5 whitespace-nowrap text-right pr-1.5 sticky left-0 bg-white">
                              {HOUR_LABELS[hour]}
                            </td>
                            {DAYS.map((_, dayIndex) => {
                              const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                              const currentHour = new Date().getHours();
                              const isToday = dayIndex === todayDow;
                              const isPastDay = mode === 'onetime' && dayIndex < todayDow;
                              const isPastHour = mode === 'onetime' && isToday && hour <= currentHour;
                              const isPast = isPastDay || isPastHour;
                              const key = getKey(dayIndex, String(hour));
                              const isSelected = selected.has(key);
                              return (
                                <td key={dayIndex} className="p-0.5">
                                  <button
                                    type="button"
                                    disabled={isPast}
                                    onPointerDown={() => !isPast && handlePointerDown(dayIndex, String(hour))}
                                    onPointerEnter={() => !isPast && handlePointerEnter(dayIndex, String(hour))}
                                    className={cn(
                                      'w-7 h-5 rounded transition-all',
                                      isPast
                                        ? 'bg-gray-50 cursor-not-allowed'
                                        : isSelected
                                          ? 'bg-indigo-500'
                                          : 'bg-gray-100 hover:bg-indigo-100'
                                    )}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {selected.size} hour{selected.size !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
          <Button
            className="w-full btn-gradient border-0 rounded-xl h-11 font-semibold"
            onClick={handleSave}
            disabled={saving || !activityType}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Invitation Row ----

function InvitationRow({
  invitation,
  onRespond,
  respondingId,
}: {
  invitation: Invitation;
  onRespond: (id: string, status: 'accepted' | 'declined') => void;
  respondingId: string | null;
}) {
  const isAutoSuggest = invitation.type === 'auto_suggest';
  const isPending = invitation.status === 'pending';
  const isResponding = respondingId === invitation.id;

  return (
    <div className={cn(
      'rounded-xl p-3 transition-all',
      isAutoSuggest ? 'border border-dashed border-purple-200 bg-purple-50/40' : 'border border-indigo-100 bg-white shadow-sm',
      invitation.status === 'accepted' && 'border-green-200 bg-green-50/30',
      invitation.status === 'declined' && 'opacity-50'
    )}>
      <div className="flex items-center gap-3">
        {invitation.inviter ? (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={invitation.inviter.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
              {invitation.inviter.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-200 to-indigo-200 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">
            {isAutoSuggest
              ? `${getActivityEmoji(invitation.suggested_activity ?? '')} ${getActivityLabel(invitation.suggested_activity ?? '')}`
              : `${invitation.inviter?.display_name ?? 'Someone'} invited you`}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {isAutoSuggest
              ? `${invitation.suggested_time ?? ''} · ${invitation.suggested_location ?? 'TBD'}`
              : invitation.event?.title ?? ''}
          </p>
        </div>

        {isPending ? (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onRespond(invitation.id, 'accepted')}
              disabled={isResponding}
              className="h-8 w-8 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center"
            >
              {isResponding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => onRespond(invitation.id, 'declined')}
              disabled={isResponding}
              className="h-8 w-8 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Badge variant="outline" className={cn(
            'text-[9px] rounded-full shrink-0',
            invitation.status === 'accepted' && 'border-green-200 text-green-700',
            invitation.status === 'declined' && 'border-gray-200 text-gray-500'
          )}>
            {invitation.status}
          </Badge>
        )}
      </div>
    </div>
  );
}
