'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Check, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ACTIVITY_TYPES } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  event_id: string | null;
  inviter_id: string | null;
  invitee_id: string;
  type: 'manual' | 'auto_suggest';
  status: 'pending' | 'accepted' | 'declined';
  message: string | null;
  suggested_location: string | null;
  suggested_activity: string | null;
  suggested_time: string | null;
  created_at: string;
  inviter: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    reputation_score: number;
  } | null;
  event: {
    id: string;
    title: string;
    activity_type: string;
    location_name: string;
    starts_at: string;
    total_spots: number;
    spots_taken: number;
  } | null;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getActivityLabel(activityType: string): string {
  const activity = ACTIVITY_TYPES.find((a) => a.value === activityType);
  return activity?.label ?? activityType;
}

function getActivityEmoji(activityType: string): string {
  const activity = ACTIVITY_TYPES.find((a) => a.value === activityType);
  return activity?.icon ?? '✨';
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function fetchInvitations() {
    try {
      const res = await fetch('/api/invitations');
      if (res.ok) {
        const { data } = await res.json();
        setInvitations(data ?? []);
      }
    } catch {
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvitations();
  }, []);

  async function handleRespond(id: string, status: 'accepted' | 'declined') {
    setRespondingId(id);
    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success(status === 'accepted' ? 'Invitation accepted!' : 'Invitation declined');
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
        );
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to respond');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRespondingId(null);
    }
  }

  const pending = invitations.filter((i) => i.status === 'pending');
  const responded = invitations.filter((i) => i.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold">Invitations</h1>
        </div>
        {pending.length > 0 && (
          <Badge className="ml-auto bg-indigo-100 text-indigo-700 border-indigo-200">
            {pending.length} pending
          </Badge>
        )}
      </div>

      {invitations.length === 0 && (
        <div className="text-center py-16">
          <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-indigo-400" />
          </div>
          <p className="text-muted-foreground font-medium">No invitations yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Set your availability and find matches!
          </p>
          <Link href="/profile/availability">
            <Button className="mt-4 btn-gradient border-0 rounded-xl">
              <Sparkles className="h-4 w-4 mr-2" />
              Set Availability
            </Button>
          </Link>
        </div>
      )}

      {/* Pending Section */}
      {pending.length > 0 && (
        <div className="space-y-3 mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Pending ({pending.length})
          </h2>
          {pending.map((inv) => (
            <InvitationCard
              key={inv.id}
              invitation={inv}
              onRespond={handleRespond}
              respondingId={respondingId}
            />
          ))}
        </div>
      )}

      {/* Responded Section */}
      {responded.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Responded ({responded.length})
          </h2>
          {responded.map((inv) => (
            <InvitationCard
              key={inv.id}
              invitation={inv}
              onRespond={handleRespond}
              respondingId={respondingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InvitationCard({
  invitation,
  onRespond,
  respondingId,
}: {
  invitation: Invitation;
  onRespond: (id: string, status: 'accepted' | 'declined') => void;
  respondingId: string | null;
}) {
  const isAutoSuggest = invitation.type === 'auto_suggest';
  const isPending = invitation.status === 'pending';
  const isResponding = respondingId === invitation.id;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 rounded-2xl transition-all',
        isAutoSuggest
          ? 'border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50/60 to-indigo-50/40'
          : 'border border-indigo-200 bg-white shadow-sm',
        invitation.status === 'accepted' && 'border-green-200 bg-green-50/30',
        invitation.status === 'declined' && 'border-gray-200 bg-gray-50/30 opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {invitation.inviter && (
            <Link href={`/profile/${invitation.inviter.id}`} className="shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-indigo-100">
                <AvatarImage
                  src={invitation.inviter.avatar_url ?? undefined}
                  alt={invitation.inviter.display_name}
                />
                <AvatarFallback className="text-sm bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-medium">
                  {invitation.inviter.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
          {isAutoSuggest && !invitation.inviter && (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-200 to-indigo-200 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
          )}
          <div className="min-w-0">
            {isAutoSuggest ? (
              <p className="text-sm font-semibold truncate">
                {getActivityEmoji(invitation.suggested_activity ?? '')} Suggested Match
              </p>
            ) : (
              <p className="text-sm font-semibold truncate">
                {invitation.inviter?.display_name ?? 'Someone'} invited you
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(invitation.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 rounded-full text-[10px]',
            invitation.status === 'pending' && 'border-amber-200 text-amber-700 bg-amber-50',
            invitation.status === 'accepted' && 'border-green-200 text-green-700 bg-green-50',
            invitation.status === 'declined' && 'border-gray-200 text-gray-500 bg-gray-50'
          )}
        >
          {invitation.status}
        </Badge>
      </div>

      {/* Content */}
      {isAutoSuggest ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">
            {getActivityLabel(invitation.suggested_activity ?? '')}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {invitation.suggested_time && (
              <span className="bg-white/80 px-2 py-0.5 rounded-full">
                🕐 {invitation.suggested_time}
              </span>
            )}
            {invitation.suggested_location && (
              <span className="bg-white/80 px-2 py-0.5 rounded-full">
                📍 {invitation.suggested_location}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {invitation.event && (
            <p className="text-sm font-medium">
              {getActivityEmoji(invitation.event.activity_type)} {invitation.event.title}
            </p>
          )}
          {invitation.event && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>📍 {invitation.event.location_name}</span>
              <span>
                🕐 {new Date(invitation.event.starts_at).toLocaleDateString()}
              </span>
              <span>
                👥 {invitation.event.spots_taken}/{invitation.event.total_spots}
              </span>
            </div>
          )}
          {invitation.message && (
            <p className="text-xs text-muted-foreground italic">
              &ldquo;{invitation.message}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isPending && (
        <div className="flex gap-2 mt-1">
          <Button
            className="flex-1 rounded-xl h-9 bg-green-600 hover:bg-green-700 text-white border-0 text-sm"
            onClick={() => onRespond(invitation.id, 'accepted')}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Accept
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-9 border-red-200 text-red-600 hover:bg-red-50 text-sm"
            onClick={() => onRespond(invitation.id, 'declined')}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Decline
              </>
            )}
          </Button>
        </div>
      )}

      {/* Link to event if accepted */}
      {invitation.status === 'accepted' && invitation.event_id && (
        <Link
          href={`/event/${invitation.event_id}`}
          className="text-xs text-indigo-600 font-medium hover:underline"
        >
          View Event →
        </Link>
      )}
    </div>
  );
}
