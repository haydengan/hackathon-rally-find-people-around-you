'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Participant } from '@/types';

interface ParticipantListProps {
  participants: Participant[];
  creatorId: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ParticipantList({ participants, creatorId }: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No participants yet
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-64">
      <div className="space-y-3">
        {participants.map((participant) => {
          const profile = participant.profile;
          const isCreator = participant.user_id === creatorId;

          return (
            <Link
              key={participant.id}
              href={`/profile/${participant.user_id}`}
              className="flex items-center gap-3 px-1 py-1 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={profile?.avatar_url ?? undefined}
                  alt={profile?.display_name ?? 'User'}
                />
                <AvatarFallback className="text-xs">
                  {profile?.display_name ? getInitials(profile.display_name) : '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {profile?.display_name ?? 'Unknown'}
                  </span>
                  {isCreator && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Host
                    </Badge>
                  )}
                </div>
              </div>

              {profile && (
                <span className="text-xs text-muted-foreground">
                  {profile.events_attended} events
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
