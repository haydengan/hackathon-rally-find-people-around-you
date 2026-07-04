'use client';

import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const timestamp = formatDistanceToNow(new Date(message.created_at), { addSuffix: true });

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%]',
        isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      {/* Avatar (only for others) */}
      {!isOwn && (
        <Avatar className="h-7 w-7 shrink-0 mt-1">
          <AvatarImage
            src={message.sender?.avatar_url ?? undefined}
            alt={message.sender?.display_name ?? 'User'}
          />
          <AvatarFallback className="text-xs">
            {message.sender?.display_name ? getInitials(message.sender.display_name) : '?'}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message bubble */}
      <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-0.5 px-1">
            {message.sender?.display_name ?? 'Unknown'}
          </span>
        )}
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm break-words',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {timestamp}
        </span>
      </div>
    </div>
  );
}
