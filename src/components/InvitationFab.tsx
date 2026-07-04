'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InvitationFab() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/invitations');
        if (res.ok) {
          const { data } = await res.json();
          const pending = (data ?? []).filter(
            (inv: { status: string }) => inv.status === 'pending'
          );
          setPendingCount(pending.length);
        }
      } catch {
        // silently fail
      }
    }

    fetchCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/invitations"
      className={cn(
        'fixed right-4 bottom-20 z-50',
        'flex items-center justify-center',
        'h-12 w-12 rounded-full',
        'bg-gradient-to-br from-indigo-500 to-purple-600',
        'shadow-lg shadow-indigo-500/30',
        'hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105',
        'active:scale-95 transition-all'
      )}
      aria-label={`Invitations${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`}
    >
      <Mail className="h-5 w-5 text-white" />
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </Link>
  );
}
