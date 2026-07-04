'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '@/app/(protected)/map/leaflet.css';

interface LocationPickerMapProps {
  defaultCenter?: { lat: number; lng: number };
  onLocationSelect: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [1.3521, 103.8198]; // Singapore

const pinIcon = L.divIcon({
  html: `<div class="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white shadow-lg flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPickerMap({ defaultCenter, onLocationSelect }: LocationPickerMapProps) {
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(
    defaultCenter ?? null
  );

  const center: [number, number] = defaultCenter
    ? [defaultCenter.lat, defaultCenter.lng]
    : DEFAULT_CENTER;

  function handleClick(lat: number, lng: number) {
    setSelectedPos({ lat, lng });
    onLocationSelect(lat, lng);
  }

  return (
    <MapContainer
      center={center}
      zoom={15}
      className="h-48 w-full rounded-lg border border-input"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onLocationSelect={handleClick} />
      {selectedPos && (
        <Marker position={[selectedPos.lat, selectedPos.lng]} icon={pinIcon} />
      )}
    </MapContainer>
  );
}
