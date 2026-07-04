'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, MapPin, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/availability', icon: Home },
  { href: '/explore', icon: CalendarDays },
  { href: '/map', icon: MapPin },
  { href: '/chats', icon: MessageCircle },
  { href: '/profile', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="h-12 w-full">
      <div className="flex h-full items-center justify-around px-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-all',
                isActive
                  ? 'text-black'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className={cn(
                'transition-all',
                isActive ? 'h-7 w-7 stroke-[2.5px]' : 'h-6 w-6 stroke-[1.5px]'
              )} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
