'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AvailabilityFab() {
  return (
    <Link
      href="/profile/availability"
      className={cn(
        'fixed left-4 bottom-20 z-50',
        'flex items-center justify-center',
        'h-12 w-12 rounded-full',
        'bg-gradient-to-br from-emerald-500 to-teal-600',
        'shadow-lg shadow-emerald-500/30',
        'hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105',
        'active:scale-95 transition-all'
      )}
      aria-label="Set availability"
    >
      <CalendarClock className="h-5 w-5 text-white" />
    </Link>
  );
}
