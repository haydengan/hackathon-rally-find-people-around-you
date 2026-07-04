'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ProfileForm } from '@/components/ProfileForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ACTIVITY_TYPES, type Profile } from '@/types';
import { Pencil, Star, Calendar, Users, Clock, Settings, LogOut } from 'lucide-react';

function getActivityBadgeClass(activityValue: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityValue)) return 'badge-sports';
  if (fitnessTypes.includes(activityValue)) return 'badge-fitness';
  if (socialTypes.includes(activityValue)) return 'badge-social';
  if (creativeTypes.includes(activityValue)) return 'badge-creative';
  if (techTypes.includes(activityValue)) return 'badge-tech';
  if (outdoorTypes.includes(activityValue)) return 'badge-outdoor';
  if (gamingTypes.includes(activityValue)) return 'badge-gaming';
  return 'badge-default';
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function loadProfile() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error('Failed to load profile');
      const { data } = await res.json();
      setProfile(data);
    } catch {
      setError('Could not load profile');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-md p-4">
        <Card>
          <CardHeader className="items-center">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="mt-2 h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-md p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{error ?? 'Profile not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-md p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Edit Profile</h1>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ProfileForm
              profile={profile}
              mode="edit"
              onSuccess={() => {
                setEditing(false);
                loadProfile();
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-20">
      <Card className="overflow-hidden shadow-vibrant border-0">
        {/* Vivid Gradient Banner */}
        <div className="h-28 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <Avatar className="size-24 border-4 border-white shadow-lg ring-4 ring-indigo-100">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold">
                {profile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <CardHeader className="items-center text-center pt-14">
          <h1 className="text-xl font-bold">{profile.display_name}</h1>
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card-green rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Calendar className="size-4 text-emerald-500" />
                <span className="text-lg font-bold text-emerald-700">{profile.events_attended}</span>
              </div>
              <p className="text-[10px] font-medium text-emerald-600 mt-0.5">Attended</p>
            </div>
            <div className="stat-card-blue rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="size-4 text-indigo-500" />
                <span className="text-lg font-bold text-indigo-700">{profile.events_created}</span>
              </div>
              <p className="text-[10px] font-medium text-indigo-600 mt-0.5">Created</p>
            </div>
          </div>

          {/* Activities with levels */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Preferred Activities</h2>
            <div className="space-y-2">
              {profile.preferred_activities.map((activityValue) => {
                const activity = ACTIVITY_TYPES.find((a) => a.value === activityValue);
                const noLevelActivities = ['coffee', 'board-games', 'creative', 'music', 'other'];
                const hasLevel = !noLevelActivities.includes(activityValue);
                const level = (profile as unknown as { activity_levels?: Record<string, string> }).activity_levels?.[activityValue];

                return (
                  <div
                    key={activityValue}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${getActivityBadgeClass(activityValue)}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{activity?.icon ?? '📍'}</span>
                      <span className="text-sm font-semibold">
                        {activity ? activity.label.replace(activity.icon + ' ', '') : activityValue}
                      </span>
                    </div>
                    {hasLevel && (
                      <span className="text-xs font-medium opacity-70 capitalize">
                        {level || 'Any level'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edit Button */}
          <Button
            variant="outline"
            className="w-full rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-medium"
            onClick={() => setEditing(true)}
          >
            <Pencil className="mr-2 size-4" />
            Edit Profile
          </Button>

          {/* Quick Links */}
          <div className="space-y-2 pt-2 border-t">
            <Link href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50/50 transition-colors group">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50">
                <Clock className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="text-sm font-medium group-hover:text-indigo-700">Event History</span>
              <svg className="h-4 w-4 text-indigo-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-purple-50/50 transition-colors group">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50">
                <Settings className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-medium group-hover:text-purple-700">Notification Settings</span>
              <svg className="h-4 w-4 text-purple-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Member since */}
          <p className="text-center text-[11px] text-muted-foreground pt-2">
            🎉 Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>

          {/* Logout Button */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 size-4" />
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
