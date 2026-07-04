'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { EventMarker } from '@/components/EventMarker';
import type { Event } from '@/types';
import '@/app/(protected)/map/leaflet.css';

interface MapViewProps {
  events: Event[];
  userLocation: { lat: number; lng: number } | null;
  onEventSelect: (event: Event) => void;
}

const DEFAULT_CENTER: [number, number] = [1.3521, 103.8198]; // Singapore
const DEFAULT_ZOOM = 14;

// Custom user location marker
const userLocationIcon = L.divIcon({
  html: `<div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function RecenterMap({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], DEFAULT_ZOOM);
    }
  }, [location, map]);

  return null;
}

export default function MapView({ events, userLocation, onEventSelect }: MapViewProps) {
  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <RecenterMap location={userLocation} />

      {/* User location marker */}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {/* Event markers */}
      {events.map((event) => (
        <EventMarker key={event.id} event={event} onSelect={onEventSelect} />
      ))}
    </MapContainer>
  );
}
