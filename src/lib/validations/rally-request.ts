import { z } from 'zod';

export const rallyRequestSchema = z.object({
  activity_type: z.string().min(1, 'Select an activity type'),
  description: z.string().max(200).optional().or(z.literal('')),
  time_range: z.string().min(1, 'Time range is required').max(100),
  radius_km: z.coerce.number().min(1).max(50),
  location_lat: z.number().min(-90).max(90),
  location_lng: z.number().min(-180).max(180),
  min_people: z.coerce.number().min(2).max(20),
});

export type RallyRequestFormData = z.infer<typeof rallyRequestSchema>;

export const fulfillRequestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
});
