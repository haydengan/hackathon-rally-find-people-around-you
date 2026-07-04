'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ACTIVITY_TYPES } from '@/types';
import { Star, Calendar, Users, UserPlus, UserMinus, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ProfileData {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  preferred_activities: string[];
  reputation_score: number;
  events_attended: number;
  events_created: number;
  created_at: string;
}

interface FollowData {
  is_following: boolean;
  follows_back: boolean;
  is_mutual: boolean;
  followers_count: number;
  following_count: number;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followData, setFollowData] = useState<FollowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchFollowStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/follows/${profileId}`);
      if (res.ok) {
        const { data } = await res.json();
        setFollowData(data);
      }
    } catch {
      // silently fail
    }
  }, [profileId]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, bio, avatar_url, preferred_activities, reputation_score, events_attended, events_created, created_at')
          .eq('id', profileId)
          .single();

        if (error || !data) {
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
    fetchFollowStatus();
  }, [profileId, fetchFollowStatus]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: profileId }),
      });

      if (res.ok) {
        await fetchFollowStatus();
      }
    } catch {
      // silently fail
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setFollowLoading(true);
    try {
      const res = await fetch('/api/follows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: profileId }),
      });

      if (res.ok) {
        await fetchFollowStatus();
      }
    } catch {
      // silently fail
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md p-4">
        <Card>
          <CardHeader className="items-center">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-6 w-32 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">Profile not found</p>
        <Button variant="outline" onClick={() => router.push('/map')}>
          Back to Map
        </Button>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profileId;

  return (
    <div className="mx-auto max-w-md p-4">
      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="size-20">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
            <AvatarFallback className="text-2xl">
              {profile.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="mt-2 text-xl font-semibold">{profile.display_name}</h1>
          {profile.bio && (
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          )}

          {/* Follow/Following counts */}
          {followData && (
            <div className="flex gap-4 mt-2 text-sm">
              <span>
                <strong>{followData.followers_count}</strong>{' '}
                <span className="text-muted-foreground">followers</span>
              </span>
              <span>
                <strong>{followData.following_count}</strong>{' '}
                <span className="text-muted-foreground">following</span>
              </span>
            </div>
          )}

          {/* Follow/Unfollow + Message buttons */}
          {!isOwnProfile && followData && (
            <div className="flex gap-2 mt-3">
              {followData.is_following ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnfollow}
                  disabled={followLoading}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  {followLoading ? 'Loading...' : 'Unfollow'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {followLoading ? 'Loading...' : 'Follow'}
                </Button>
              )}

              {followData.is_mutual && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/chats/dm/${profileId}`)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Star className="size-4 text-yellow-500" />
                <span className="text-lg font-semibold">{profile.reputation_score}</span>
              </div>
              <p className="text-xs text-muted-foreground">Reputation</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Calendar className="size-4 text-primary" />
                <span className="text-lg font-semibold">{profile.events_attended}</span>
              </div>
              <p className="text-xs text-muted-foreground">Attended</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Users className="size-4 text-primary" />
                <span className="text-lg font-semibold">{profile.events_created}</span>
              </div>
              <p className="text-xs text-muted-foreground">Created</p>
            </div>
          </div>

          {/* Activities */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Preferred Activities</h2>
            <div className="flex flex-wrap gap-2">
              {profile.preferred_activities.map((activityValue: string) => {
                const activity = ACTIVITY_TYPES.find((a) => a.value === activityValue);
                return (
                  <Badge key={activityValue} variant="secondary">
                    {activity ? activity.label : activityValue}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Member since */}
          <p className="text-center text-xs text-muted-foreground">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
