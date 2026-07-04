'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Clock, Star, Loader2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ACTIVITY_TYPES, type RallyRequest } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RallyRequestCardProps {
  request: RallyRequest;
  currentUserId?: string;
  onHandChange?: () => void;
  onCreateEvent?: (request: RallyRequest) => void;
}

function getActivityLabel(activityType: string): string {
  const activity = ACTIVITY_TYPES.find((a) => a.value === activityType);
  return activity?.label ?? activityType;
}

function getActivityEmoji(activityType: string): string {
  const activity = ACTIVITY_TYPES.find((a) => a.value === activityType);
  return activity?.icon ?? '✨';
}

export function RallyRequestCard({
  request,
  currentUserId,
  onHandChange,
  onCreateEvent,
}: RallyRequestCardProps) {
  const [loading, setLoading] = useState(false);
  const [handRaised, setHandRaised] = useState(request.user_raised_hand ?? false);
  const [handCount, setHandCount] = useState(request.hand_count ?? 0);

  const isCreator = currentUserId === request.user_id;
  const enoughHands = handCount >= request.min_people;
  const expiresIn = formatDistanceToNow(new Date(request.expires_at), { addSuffix: true });

  async function handleRaiseHand() {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${request.id}/hand`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to raise hand');
      } else {
        setHandRaised(true);
        setHandCount((c) => c + 1);
        toast.success("You're interested! 🙋");
        onHandChange?.();
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleLowerHand() {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${request.id}/hand`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to lower hand');
      } else {
        setHandRaised(false);
        setHandCount((c) => Math.max(0, c - 1));
        toast.success('Hand lowered');
        onHandChange?.();
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(
      'flex flex-col gap-3 p-5 rounded-2xl',
      'border-2 border-dashed border-indigo-200',
      'bg-gradient-to-br from-indigo-50/60 to-purple-50/40',
      'backdrop-blur-sm shadow-sm'
    )}>
      {/* Header: Creator + Activity */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {request.creator && (
            <Link href={`/profile/${request.creator.id}`} className="shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-indigo-200">
                <AvatarImage src={request.creator.avatar_url ?? undefined} alt={request.creator.display_name} />
                <AvatarFallback className="text-sm bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-medium">
                  {request.creator.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
          <div className="min-w-0">
            {request.creator && (
              <Link href={`/profile/${request.creator.id}`} className="hover:underline">
                <p className="text-sm font-semibold truncate">{request.creator.display_name}</p>
              </Link>
            )}
            <p className="text-xs text-muted-foreground">wants to do something</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 rounded-full text-xs bg-white/80">
          {getActivityEmoji(request.activity_type)} {getActivityLabel(request.activity_type).replace(/^[^\s]+\s/, '')}
        </Badge>
      </div>

      {/* Description */}
      {request.description && (
        <p className="text-sm text-foreground/80 leading-relaxed">
          &ldquo;{request.description}&rdquo;
        </p>
      )}

      {/* Details row */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>{request.time_range}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          <span>within {request.radius_km}km</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <span>expires {expiresIn}</span>
        </div>
      </div>

      {/* Hand count */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🙋</span>
          <span className={cn(
            'text-sm font-semibold',
            enoughHands ? 'text-green-600' : 'text-indigo-600'
          )}>
            {handCount}/{request.min_people} people interested
          </span>
          {enoughHands && (
            <Badge className="rounded-full bg-green-100 text-green-700 border-green-200 text-[10px] px-2">
              Ready!
            </Badge>
          )}
        </div>
        {request.creator && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold text-amber-700">{request.creator.reputation_score}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-1">
        {isCreator && enoughHands && onCreateEvent && (
          <Button
            className="flex-1 rounded-xl h-10 bg-green-600 hover:bg-green-700 text-white border-0"
            onClick={() => onCreateEvent(request)}
          >
            <Users className="h-4 w-4 mr-1.5" />
            Create Event & Invite
          </Button>
        )}
        {!isCreator && (
          <Button
            className={cn(
              'flex-1 rounded-xl h-10',
              handRaised
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200'
                : 'btn-gradient border-0'
            )}
            onClick={handRaised ? handleLowerHand : handleRaiseHand}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {handRaised ? '🙋 Lower Hand' : '🙋 Raise Hand'}
          </Button>
        )}
        {isCreator && !enoughHands && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Waiting for {request.min_people - handCount} more...
          </div>
        )}
      </div>
    </div>
  );
}
