'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { rallyRequestSchema, type RallyRequestFormData } from '@/lib/validations/rally-request';
import type { Resolver } from 'react-hook-form';
import { ACTIVITY_TYPES } from '@/types';
import { LocationSearch } from '@/components/LocationSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface CreateRequestFormProps {
  defaultLocation?: { lat: number; lng: number } | null;
  onSuccess?: () => void;
}

const RADIUS_OPTIONS = [
  { value: '1', label: '1 km' },
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
];

export function CreateRequestForm({ defaultLocation, onSuccess }: CreateRequestFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RallyRequestFormData>({
    resolver: zodResolver(rallyRequestSchema) as Resolver<RallyRequestFormData>,
    defaultValues: {
      activity_type: '',
      description: '',
      time_range: '',
      radius_km: 5,
      location_lat: defaultLocation?.lat ?? 0,
      location_lng: defaultLocation?.lng ?? 0,
      min_people: 3,
    },
  });

  function handleLocationSelect(name: string, lat: number, lng: number) {
    // We store location name for display but the schema only needs lat/lng
    form.setValue('location_lat', lat);
    form.setValue('location_lng', lng);
    // Store in a hidden way - we just need lat/lng for the API
    (form as unknown as { _locationName: string })._locationName = name;
  }

  async function onSubmit(data: RallyRequestFormData) {
    if (data.location_lat === 0 && data.location_lng === 0) {
      toast.error('Please select a location');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : 'Failed to create request';
        toast.error(errorMsg);
        return;
      }

      toast.success('Request posted! Others can now raise their hand. 🙋');
      onSuccess?.();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Activity Type */}
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

        {/* Time Range */}
        <FormField
          control={form.control}
          name="time_range"
          render={({ field }) => (
            <FormItem>
              <FormLabel>When?</FormLabel>
              <FormControl>
                <Input
                  placeholder='e.g. "Tonight 6-9pm", "This Saturday morning"'
                  {...field}
                />
              </FormControl>
              <FormDescription>Describe when you&apos;re available</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Radius */}
        <FormField
          control={form.control}
          name="radius_km"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How far are you willing to go?</FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={(val) => field.onChange(Number(val))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select radius" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RADIUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Min People */}
        <FormField
          control={form.control}
          name="min_people"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How many people needed?</FormLabel>
              <FormControl>
                <Input type="number" min={2} max={20} {...field} />
              </FormControl>
              <FormDescription>Minimum people to make it happen (2-20)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Your area</label>
          <LocationSearch
            value=""
            onSelect={handleLocationSelect}
            placeholder="Search your neighborhood..."
          />
          {form.formState.errors.location_lat && (
            <p className="text-destructive text-sm font-medium">
              Location is required
            </p>
          )}
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anything else? (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Looking for chill pickup game, all levels welcome..."
                  rows={2}
                  maxLength={200}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {(field.value?.length ?? 0)}/200 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button type="submit" className="w-full btn-gradient border-0" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? 'Posting...' : '📢 Broadcast Request'}
        </Button>
      </form>
    </Form>
  );
}
