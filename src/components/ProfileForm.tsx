'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileFormData } from '@/lib/validations/profile';
import { ACTIVITY_TYPES, type Profile } from '@/types';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ProfileFormProps {
  profile?: Profile;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
}

function getActivityColor(activityValue: string): { selected: string; iconBg: string } {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityValue)) return { selected: 'border-rose-300 bg-rose-50 text-rose-800 shadow-sm shadow-rose-500/10 ring-1 ring-rose-200', iconBg: 'bg-rose-200' };
  if (fitnessTypes.includes(activityValue)) return { selected: 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-200', iconBg: 'bg-emerald-200' };
  if (socialTypes.includes(activityValue)) return { selected: 'border-pink-300 bg-pink-50 text-pink-800 shadow-sm shadow-pink-500/10 ring-1 ring-pink-200', iconBg: 'bg-pink-200' };
  if (creativeTypes.includes(activityValue)) return { selected: 'border-purple-300 bg-purple-50 text-purple-800 shadow-sm shadow-purple-500/10 ring-1 ring-purple-200', iconBg: 'bg-purple-200' };
  if (techTypes.includes(activityValue)) return { selected: 'border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-200', iconBg: 'bg-indigo-200' };
  if (outdoorTypes.includes(activityValue)) return { selected: 'border-teal-300 bg-teal-50 text-teal-800 shadow-sm shadow-teal-500/10 ring-1 ring-teal-200', iconBg: 'bg-teal-200' };
  if (gamingTypes.includes(activityValue)) return { selected: 'border-red-300 bg-red-50 text-red-800 shadow-sm shadow-red-500/10 ring-1 ring-red-200', iconBg: 'bg-red-200' };
  return { selected: 'border-gray-300 bg-gray-50 text-gray-800 shadow-sm shadow-gray-500/10 ring-1 ring-gray-200', iconBg: 'bg-gray-200' };
}

export function ProfileForm({ profile, mode, onSuccess }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityLevels, setActivityLevels] = useState<Record<string, string>>(
    (profile as unknown as { activity_levels?: Record<string, string> })?.activity_levels ?? {}
  );

  const NO_LEVEL_ACTIVITIES = ['coffee', 'board-games', 'creative', 'music', 'other'];

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name ?? '',
      bio: profile?.bio ?? '',
      preferred_activities: profile?.preferred_activities ?? [],
    },
  });

  async function onSubmit(data: ProfileFormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = mode === 'create' ? '/api/profile/setup' : '/api/profile';
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, activity_levels: activityLevels }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Something went wrong');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Display Name */}
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold">Display Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="What should people call you?"
                  className="h-11 rounded-xl border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bio */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold">Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A short intro about yourself (optional)"
                  className="resize-none rounded-xl border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                {field.value?.length ?? 0}/160
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preferred Activities — VIVID color per activity */}
        <FormField
          control={form.control}
          name="preferred_activities"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold">Preferred Activities 🎯</FormLabel>
              <p className="text-xs text-muted-foreground mb-3">
                Select the activities you enjoy — each one has its own vibe!
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {ACTIVITY_TYPES.map((activity) => {
                  const isSelected = field.value.includes(activity.value);
                  const colors = getActivityColor(activity.value);
                  return (
                    <button
                      key={activity.value}
                      type="button"
                      onClick={() => {
                        const updated = isSelected
                          ? field.value.filter((v) => v !== activity.value)
                          : [...field.value, activity.value];
                        field.onChange(updated);
                      }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all',
                        isSelected
                          ? `${colors.selected} scale-[1.02]`
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      )}
                    >
                      <span className={cn(
                        'flex items-center justify-center h-7 w-7 rounded-lg text-base',
                        isSelected ? colors.iconBg : 'bg-gray-100'
                      )}>
                        {activity.icon}
                      </span>
                      <span className={cn(
                        'truncate',
                        isSelected && 'font-semibold'
                      )}>
                        {activity.label.replace(activity.icon + ' ', '')}
                      </span>
                    </button>
                  );
                })}
              </div>
              <FormMessage />

              {/* Level selector for selected activities */}
              {field.value.length > 0 && field.value.some((v) => !NO_LEVEL_ACTIVITIES.includes(v)) && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Set your level</p>
                  {field.value.filter((v) => !NO_LEVEL_ACTIVITIES.includes(v)).map((actVal) => {
                    const act = ACTIVITY_TYPES.find((a) => a.value === actVal);
                    const currentLevel = activityLevels[actVal] || '';
                    return (
                      <div key={actVal} className="flex items-center gap-2 rounded-lg border border-gray-100 p-2">
                        <span className="text-sm">{act?.icon}</span>
                        <span className="text-xs font-medium flex-1 truncate">{act?.label.replace((act?.icon ?? '') + ' ', '')}</span>
                        <div className="flex gap-1">
                          {['beginner', 'intermediate', 'pro'].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setActivityLevels((prev) => ({ ...prev, [actVal]: currentLevel === lvl ? '' : lvl }))}
                              className={cn(
                                'px-2 py-1 rounded-md text-[10px] font-medium transition-all',
                                currentLevel === lvl
                                  ? 'bg-indigo-500 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              )}
                            >
                              {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormItem>
          )}
        />

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button type="submit" className="w-full h-12 rounded-xl btn-gradient border-0 text-base font-semibold" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {mode === 'create' ? '🚀 Create Profile' : '✨ Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
