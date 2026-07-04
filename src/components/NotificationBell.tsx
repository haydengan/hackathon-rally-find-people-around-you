'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const { data, unread_count } = await res.json();
        setNotifications(data);
        setUnreadCount(unread_count);
      }
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch {
      // Silently fail
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'now_nearby':
        return '📍';
      case 'event_reminder':
        return '⏰';
      case 'event_modified':
        return '✏️';
      case 'new_participant':
        return '👋';
      case 'event_cancelled':
        return '❌';
      default:
        return '🔔';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {loading && notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                'flex flex-col items-start gap-1 p-3 cursor-pointer',
                !notification.read && 'bg-muted/50'
              )}
            >
              <div className="flex items-start gap-2 w-full">
                <span className="text-base shrink-0">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {notification.title}
                  </p>
                  {notification.body && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <span className="h-2 w-2 rounded-full bg-rally-primary shrink-0 mt-1" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
