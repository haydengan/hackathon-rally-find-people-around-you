'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useGeolocation } from '@/hooks/useGeolocation';
import { EventForm } from '@/components/EventForm';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CreateEventPage() {
  const { location } = useGeolocation();

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur">
        <Link href="/map" className="p-1 -ml-1 rounded-md hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Create Event</h1>
      </div>

      {/* Scrollable Form */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-5 pb-24 max-w-lg mx-auto">
          <EventForm defaultLocation={location} />
        </div>
      </ScrollArea>
    </div>
  );
}
