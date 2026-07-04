'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { eventSchema, type EventFormData } from '@/lib/validations/event';
import type { Resolver } from 'react-hook-form';
import { ACTIVITY_TYPES, SKILL_LEVELS } from '@/types';
import { LocationSearch } from '@/components/LocationSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EventFormProps {
  defaultLocation?: { lat: number; lng: number } | null;
  onSuccess?: () => void;
}

export function EventForm({ defaultLocation, onSuccess }: EventFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema) as Resolver<EventFormData>,
    defaultValues: {
      title: '',
      description: '',
      activity_type: '',
      skill_level: 'any',
      location_lat: defaultLocation?.lat ?? 0,
      location_lng: defaultLocation?.lng ?? 0,
      location_name: '',
      starts_at: '',
      ends_at: '',
      total_spots: 5,
      min_participants: 2,
      cost_per_person: 0,
      is_now: false,
      min_reputation: 0,
      recurrence: null,
    },
  });

  // Auto-set is_now based on time: Live (during event) or Starting Soon (within 1hr)
  const startsAt = form.watch('starts_at');
  const endsAt = form.watch('ends_at');
  useEffect(() => {
    if (startsAt) {
      const now = Date.now();
      const start = new Date(startsAt).getTime();
      const end = endsAt ? new Date(endsAt).getTime() : start + 2 * 60 * 60 * 1000;
      if ((now >= start && now <= end) || (start > now && start <= now + 60 * 60 * 1000)) {
        form.setValue('is_now', true);
      } else {
        form.setValue('is_now', false);
      }
    }
  }, [startsAt, endsAt, form]);

  // Auto-fill title when activity type is selected (if title is empty)
  const activityType = form.watch('activity_type');
  useEffect(() => {
    if (activityType) {
      const currentTitle = form.getValues('title');
      if (!currentTitle || ACTIVITY_TYPES.some(a => a.label.replace(a.icon + ' ', '') === currentTitle)) {
        const activity = ACTIVITY_TYPES.find(a => a.value === activityType);
        if (activity) {
          form.setValue('title', activity.label.replace(activity.icon + ' ', ''));
        }
      }
      // Default skill level to beginner when activity is first selected
      const currentSkill = form.getValues('skill_level');
      if (currentSkill === 'any') {
        form.setValue('skill_level', 'beginner');
      }
    }
  }, [activityType, form]);

  function handleLocationSelect(name: string, lat: number, lng: number) {
    form.setValue('location_name', name);
    form.setValue('location_lat', lat);
    form.setValue('location_lng', lng);
  }

  async function onSubmit(data: EventFormData) {
    setSubmitting(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : 'Failed to create event';
        toast.error(errorMsg);
        return;
      }

      toast.success('Event created! Redirecting to map...');
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/map');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Activity Type (FIRST) */}
        <FormField
          control={form.control}
          name="activity_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What do you want to do?</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Title (auto-filled from activity) */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Basketball pickup game" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Skill Level */}
        <FormField
          control={form.control}
          name="skill_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skill Level</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SKILL_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start Time */}
        <FormField
          control={form.control}
          name="starts_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* End Time */}
        <FormField
          control={form.control}
          name="ends_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Recurrence - only show when not a NOW event */}
        {!form.watch('is_now') && (
          <FormField
            control={form.control}
            name="recurrence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recurrence</FormLabel>
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="One-time event" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Location Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Location</label>
          <LocationSearch
            value={form.watch('location_name')}
            onSelect={handleLocationSelect}
            placeholder="Search for a place..."
          />
          {form.formState.errors.location_name && (
            <p className="text-destructive text-sm font-medium">
              {form.formState.errors.location_name.message}
            </p>
          )}
        </div>

        {/* Total Spots */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="total_spots"
            render={({ field }) => (
              <FormItem>
                <FormLabel>People Needed</FormLabel>
                <FormControl>
                  <Input type="number" min={2} max={50} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Min Participants */}
          <FormField
            control={form.control}
            name="min_participants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min to Confirm</FormLabel>
                <FormControl>
                  <Input type="number" min={2} max={50} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Cost Per Person */}
        <FormField
          control={form.control}
          name="cost_per_person"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost Per Person ($)</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={500} step={0.5} placeholder="0" {...field} />
              </FormControl>
              <FormDescription>Leave as 0 for free events</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What should participants know?"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Is NOW */}
        <FormField
          control={form.control}
          name="is_now"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Urgent 🔥</FormLabel>
                <FormDescription className="text-xs">
                  Happening within 2 hours — broadcasts to nearby users
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Min Reputation */}
        <FormField
          control={form.control}
          name="min_reputation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Min Reputation (0-80)</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={80} placeholder="0" {...field} />
              </FormControl>
              <FormDescription>
                Set to 0 to allow anyone to join
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? 'Creating...' : 'Create Event'}
        </Button>
      </form>
    </Form>
  );
}
