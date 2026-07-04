'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ReputationBadgeProps {
  score: number;
  eventsAttended?: number;
  className?: string;
}

export function ReputationBadge({ score, eventsAttended, className }: ReputationBadgeProps) {
  // Show "New" badge for users with fewer than 3 events attended
  if (eventsAttended !== undefined && eventsAttended < 3) {
    return (
      <Badge
        variant="outline"
        className={cn('text-xs font-medium border-blue-300 text-blue-600', className)}
      >
        New
      </Badge>
    );
  }

  // Color coded: green (80-100), yellow (50-79), red (0-49)
  const getColor = () => {
    if (score >= 80) return 'border-green-300 text-green-700 bg-green-50';
    if (score >= 50) return 'border-yellow-300 text-yellow-700 bg-yellow-50';
    return 'border-red-300 text-red-700 bg-red-50';
  };

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', getColor(), className)}
    >
      {score}
    </Badge>
  );
}
