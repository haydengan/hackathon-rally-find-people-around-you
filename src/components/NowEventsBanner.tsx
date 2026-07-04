'use client';

import { Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '@/components/CountdownTimer';
import { ACTIVITY_TYPES, type Event } from '@/types';
import { formatDistance } from '@/lib/geo';

interface NowEventsBannerProps {
  events: Event[];
  onEventSelect: (event: Event) => void;
}

export function NowEventsBanner({ events, onEventSelect }: NowEventsBannerProps) {
  const nowEvents = events.filter((e) => e.is_now);

  if (nowEvents.length === 0) return null;

  return (
    <div className="absolute top-14 left-0 right-0 z-[999] px-3">
      <div className="bg-background/95 backdrop-blur border rounded-xl shadow-lg p-2">
        <div className="flex items-center gap-1.5 px-2 mb-2">
          <Zap className="h-3.5 w-3.5 text-rally-secondary fill-rally-secondary" />
          <span className="text-xs font-semibold text-rally-secondary">Happening Now</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">
            {nowEvents.length}
          </Badge>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {nowEvents.map((event) => {
            const activity = ACTIVITY_TYPES.find((a) => a.value === event.activity_type);
            const spotsLeft = event.total_spots - event.spots_taken;

            return (
              <button
                key={event.id}
                onClick={() => onEventSelect(event)}
                className="flex-shrink-0 w-44 rounded-lg border border-rally-secondary/30 bg-gradient-to-br from-rally-secondary/5 to-transparent p-2.5 text-left transition-all hover:border-rally-secondary/60 hover:shadow-sm"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{activity?.icon ?? '📍'}</span>
                  <span className="text-xs font-medium truncate flex-1">{event.title}</span>
                </div>

                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-rally-secondary">
                    <CountdownTimer targetDate={event.starts_at} />
                  </span>
                </div>

                {event.distance_km !== undefined && (
                  <span className="text-[10px] text-muted-foreground">
                    📍 {formatDistance(event.distance_km)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
