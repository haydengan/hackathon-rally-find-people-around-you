import { z } from 'zod';

export const eventSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(80),
  description: z.string().max(500).optional().or(z.literal('')),
  activity_type: z.string().min(1, 'Select an activity type'),
  skill_level: z.enum(['beginner', 'intermediate', 'pro', 'any']),
  location_lat: z.number().min(-90).max(90),
  location_lng: z.number().min(-180).max(180),
  location_name: z.string().min(1, 'Location is required').max(200),
  starts_at: z.string().min(1, 'Start time is required'),
  ends_at: z.string().min(1, 'End time is required'),
  total_spots: z.coerce.number().min(2).max(50),
  min_participants: z.coerce.number().min(2).max(50),
  cost_per_person: z.coerce.number().min(0).max(500),
  is_now: z.boolean(),
  min_reputation: z.coerce.number().min(0).max(80),
  recurrence: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).nullable().optional(),
});

export type EventFormData = z.infer<typeof eventSchema>;
