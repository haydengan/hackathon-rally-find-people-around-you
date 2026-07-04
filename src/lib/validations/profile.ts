import { z } from 'zod';

export const profileSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(40, 'Display name must be at most 40 characters'),
  bio: z
    .string()
    .max(160, 'Bio must be at most 160 characters')
    .optional()
    .or(z.literal('')),
  preferred_activities: z
    .array(z.string())
    .min(1, 'Select at least one activity'),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
