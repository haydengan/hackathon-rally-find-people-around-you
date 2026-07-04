'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { MapPin, Users, Clock, DollarSign, Star, Loader2, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { CountdownTimer } from '@/components/CountdownTimer';
import { ACTIVITY_TYPES, SKILL_LEVELS, type Event } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EventCardProps {
  event: Event;
}

function getActivityLabel(activityType: string): string {
  const activity = ACTIVITY_TYPES.find((a) => a.value === activityType);
  return activity?.label ?? activityType;
}

function getSkillLabel(skillLevel: string): string {
  const skill = SKILL_LEVELS.find((s) => s.value === skillLevel);
  return skill?.label ?? skillLevel;
}

function getActivityBorderClass(activityType: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityType)) return 'activity-border-sports';
  if (fitnessTypes.includes(activityType)) return 'activity-border-fitness';
  if (socialTypes.includes(activityType)) return 'activity-border-social';
  if (creativeTypes.includes(activityType)) return 'activity-border-creative';
  if (techTypes.includes(activityType)) return 'activity-border-tech';
  if (outdoorTypes.includes(activityType)) return 'activity-border-outdoor';
  if (gamingTypes.includes(activityType)) return 'activity-border-gaming';
  return 'activity-border-tech';
}

function getActivityBgClass(activityType: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityType)) return 'activity-bg-sports';
  if (fitnessTypes.includes(activityType)) return 'activity-bg-fitness';
  if (socialTypes.includes(activityType)) return 'activity-bg-social';
  if (creativeTypes.includes(activityType)) return 'activity-bg-creative';
  if (techTypes.includes(activityType)) return 'activity-bg-tech';
  if (outdoorTypes.includes(activityType)) return 'activity-bg-outdoor';
  if (gamingTypes.includes(activityType)) return 'activity-bg-gaming';
  return 'activity-bg-default';
}

function getActivityIconCircleClass(activityType: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityType)) return 'icon-circle-sports';
  if (fitnessTypes.includes(activityType)) return 'icon-circle-fitness';
  if (socialTypes.includes(activityType)) return 'icon-circle-social';
  if (creativeTypes.includes(activityType)) return 'icon-circle-creative';
  if (techTypes.includes(activityType)) return 'icon-circle-tech';
  if (outdoorTypes.includes(activityType)) return 'icon-circle-outdoor';
  if (gamingTypes.includes(activityType)) return 'icon-circle-gaming';
  return 'icon-circle-tech';
}

function getActivityBadgeClass(activityType: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board_games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityType)) return 'badge-sports';
  if (fitnessTypes.includes(activityType)) return 'badge-fitness';
  if (socialTypes.includes(activityType)) return 'badge-social';
  if (creativeTypes.includes(activityType)) return 'badge-creative';
  if (techTypes.includes(activityType)) return 'badge-tech';
  if (outdoorTypes.includes(activityType)) return 'badge-outdoor';
  if (gamingTypes.includes(activityType)) return 'badge-gaming';
  return 'badge-default';
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const spotsRemaining = event.total_spots - event.spots_taken;
  const startsAt = new Date(event.starts_at);
  const isFull = spotsRemaining <= 0;

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await fetch(`/api/events/${event.id}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to join');
      } else {
        toast.success('Joined! Redirecting...');
        router.push(`/event/${event.id}`);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setJoining(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/event/${event.id}`;
    const shareData = {
      title: event.title,
      text: `Join me for ${event.title}! ${spotsRemaining} spots left.`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  }

  return (
    <div className={cn(
      'flex flex-col gap-3 p-5 rounded-2xl backdrop-blur-sm shadow-sm card-hover',
      getActivityBorderClass(event.activity_type),
      getActivityBgClass(event.activity_type)
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate">{event.title}</h3>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${getActivityBadgeClass(event.activity_type)}`}>
              {getActivityLabel(event.activity_type)}
            </span>
            {(() => {
              const now = Date.now();
              const start = new Date(event.starts_at).getTime();
              const end = event.ends_at ? new Date(event.ends_at).getTime() : start + 2 * 60 * 60 * 1000;
              if (now >= start && now <= end) {
                return <Badge className="rounded-full bg-red-500 text-white border-0 shadow-sm text-[11px] px-2.5 animate-pulse">🔴 Live</Badge>;
              } else if (start > now && start <= now + 60 * 60 * 1000) {
                return <Badge className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm text-[11px] px-2.5">⚡ Starting Soon</Badge>;
              }
              return null;
            })()}
            <Badge variant="outline" className="rounded-full text-[11px]">
              {getSkillLabel(event.skill_level)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center justify-center h-7 w-7 rounded-lg", getActivityIconCircleClass(event.activity_type))}>
            <Clock className="h-3.5 w-3.5" />
          </div>
          <span className="truncate">
            {format(startsAt, 'MMM d, h:mm a')}
            {(() => {
              const now = Date.now();
              const start = new Date(event.starts_at).getTime();
              const end = event.ends_at ? new Date(event.ends_at).getTime() : start + 2 * 60 * 60 * 1000;
              if (now >= start && now <= end) {
                return <span className="text-red-500 font-medium ml-1">· Live now</span>;
              } else if (start > now && start <= now + 60 * 60 * 1000) {
                return <span className="text-amber-600 font-medium ml-1">· <CountdownTimer targetDate={event.starts_at} /></span>;
              }
              return null;
            })()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50">
            <Users className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <span className={cn(spotsRemaining > 0 ? 'font-semibold text-indigo-600' : 'text-muted-foreground')}>
            {spotsRemaining > 0 ? `Need ${spotsRemaining} more` : 'Full'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <span className="truncate">{event.location_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-amber-100 to-amber-50">
            <DollarSign className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <span>{event.cost_per_person === 0 ? '✨ Free' : `$${event.cost_per_person}`}</span>
        </div>
      </div>

      {/* Creator info */}
      {event.creator && (
        <Link
          href={`/profile/${event.creator.id}`}
          className="flex items-center gap-2.5 pt-2 border-t border-white/50 hover:bg-white/30 rounded-lg px-1 py-1.5 -mx-1 transition-colors"
        >
          <Avatar className="h-7 w-7 ring-2 ring-white">
            <AvatarImage src={event.creator.avatar_url ?? undefined} alt={event.creator.display_name} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-medium">
              {event.creator.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">{event.creator.display_name}</span>
        </Link>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          className="shrink-0 rounded-xl h-10 w-10 bg-white/60 border-white/80 hover:bg-white"
          aria-label="Share event"
        >
          <Share2 className="h-4 w-4 text-indigo-600" />
        </Button>
        <Link
          href={`/event/${event.id}`}
          className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 rounded-xl h-10 bg-white/60 border-white/80 hover:bg-white')}
        >
          View Details
        </Link>
        <Button
          className="flex-1 rounded-xl h-10 btn-gradient border-0"
          onClick={handleJoin}
          disabled={joining || isFull}
        >
          {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isFull ? 'Full' : `Join (${spotsRemaining} left)`}
        </Button>
      </div>
    </div>
  );
}
