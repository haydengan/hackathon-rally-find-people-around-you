'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, SlidersHorizontal } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventCard } from '@/components/EventCard';
import { FilterPanel, getActiveFilterCount } from '@/components/FilterPanel';
import { NotificationBell } from '@/components/NotificationBell';
import { calculateDistance, isWithinRadius } from '@/lib/geo';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { Event, MapFilters } from '@/types';

// Dynamic import for MapView (Leaflet requires window/document)
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

const DEFAULT_FILTERS: MapFilters = {
  activity_types: [],
  skill_level: undefined,
  free_only: false,
  radius_km: 10,
};

export default function MapPage() {
  const { location, loading, error } = useGeolocation();

  // Save user location to profile for auto-matching
  useEffect(() => {
    if (location) {
      fetch('/api/profile/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: location.lat, lng: location.lng }),
      }).catch(() => {});
    }
  }, [location]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.activity_types.length === 1) {
        params.set('activity_type', filters.activity_types[0]);
      }
      if (filters.skill_level) {
        params.set('skill_level', filters.skill_level);
      }
      if (filters.free_only) {
        params.set('free_only', 'true');
      }

      const response = await fetch(`/api/events?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setEvents(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setEventsLoading(false);
    }
  }, [filters.activity_types, filters.skill_level, filters.free_only]);

  // Fetch events on mount and when filters change
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Client-side filtering (distance, multi-activity-type)
  const filteredEvents = events.filter((event) => {
    if (location && event.location) {
      if (!isWithinRadius(event.location, location, filters.radius_km)) {
        return false;
      }
    }
    if (filters.activity_types.length > 1) {
      if (!filters.activity_types.includes(event.activity_type)) {
        return false;
      }
    }
    return true;
  });

  // Add distance_km to filtered events
  const eventsWithDistance = filteredEvents.map((event) => ({
    ...event,
    distance_km: location && event.location
      ? calculateDistance(location, event.location)
      : undefined,
  }));

  function handleEventSelect(event: Event) {
    setSelectedEvent(event);
    setDrawerOpen(true);
  }

  function handleFiltersChange(newFilters: MapFilters) {
    setFilters(newFilters);
  }

  const activeFilterCount = getActiveFilterCount(filters);

  return (
    <div className="h-[calc(100vh-48px)] relative -mx-[calc((100vw-100%)/2)]">
      {/* Loading state */}
      {loading && (
        <div className="h-full w-full flex flex-col items-center justify-center gap-3">
          <Skeleton className="h-full w-full absolute inset-0" />
          <div className="z-10 flex flex-col items-center gap-2 text-muted-foreground">
            <MapPin className="h-6 w-6 animate-pulse" />
            <p className="text-sm">Getting your location...</p>
          </div>
        </div>
      )}

      {/* Geolocation denied message */}
      {!loading && error && (
        <div className="absolute top-4 left-4 right-4 z-10 bg-background/95 backdrop-blur rounded-lg border p-3 shadow-sm">
          <p className="text-sm text-muted-foreground">
            📍 Location access denied. Showing Singapore as default.
          </p>
        </div>
      )}

      {/* Top controls (floating) */}
      {!loading && (
        <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
          <NotificationBell />
          <Button
            size="sm"
            onClick={() => setFilterOpen(true)}
            className="shadow-lg relative btn-gradient border-0 rounded-xl"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-pink-500 border-0"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Event count */}
      {!loading && !eventsLoading && (
        <div className="absolute top-4 left-4 z-[1000]" aria-live="polite">
          <div className="bg-background/95 backdrop-blur rounded-lg border px-3 py-1.5 shadow-sm">
            <p className="text-xs text-muted-foreground">
              {eventsWithDistance.length} event{eventsWithDistance.length !== 1 ? 's' : ''} nearby
            </p>
          </div>
        </div>
      )}

      {/* Events loading indicator */}
      {!loading && eventsLoading && (
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="bg-background/95 backdrop-blur rounded-lg border px-3 py-1.5 shadow-sm">
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}

      {/* Map */}
      {!loading && (
        <MapView
          events={eventsWithDistance}
          userLocation={location}
          onEventSelect={handleEventSelect}
        />
      )}

      {/* Filter Panel */}
      <FilterPanel
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onChange={handleFiltersChange}
      />

      {/* Event detail drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{selectedEvent?.title ?? 'Event Details'}</DrawerTitle>
          </DrawerHeader>
          {selectedEvent && <EventCard event={selectedEvent} />}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
