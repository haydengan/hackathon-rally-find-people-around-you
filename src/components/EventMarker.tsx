'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ACTIVITY_TYPES, type Event } from '@/types';

interface EventMarkerProps {
  event: Event;
  onSelect: (event: Event) => void;
}

function getActivityEmoji(activityType: string): string {
  const activity = ACTIVITY_TYPES.find((a) => a.value === activityType);
  return activity?.icon ?? '📍';
}

function createMarkerIcon(event: Event): L.DivIcon {
  const emoji = getActivityEmoji(event.activity_type);
  const spotsRemaining = event.total_spots - event.spots_taken;
  const isNow = event.is_now;

  const html = `
    <div class="event-marker ${isNow ? 'now-marker' : ''}" role="img" aria-label="${event.title} - ${spotsRemaining} spots remaining">
      <span>${emoji}</span>
      <span class="spots-badge">${spotsRemaining}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

export function EventMarker({ event, onSelect }: EventMarkerProps) {
  const icon = createMarkerIcon(event);

  return (
    <Marker
      position={[event.location.lat, event.location.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(event),
      }}
    >
      <Popup>
        <div className="text-sm font-medium">{event.title}</div>
      </Popup>
    </Marker>
  );
}
