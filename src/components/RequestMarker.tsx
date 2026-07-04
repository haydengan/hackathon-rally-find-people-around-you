'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ACTIVITY_TYPES, type RallyRequest } from '@/types';

interface RequestMarkerProps {
  request: RallyRequest;
  onSelect: (request: RallyRequest) => void;
}

function getActivityEmoji(activityType: string): string {
  const activity = ACTIVITY_TYPES.find((a) => a.value === activityType);
  return activity?.icon ?? '✨';
}

function getActivityColor(activityType: string): string {
  const sportTypes = ['basketball', 'football', 'badminton', 'tennis', 'swimming'];
  const fitnessTypes = ['running', 'gym'];
  const socialTypes = ['coffee', 'board-games'];
  const creativeTypes = ['creative', 'music'];
  const techTypes = ['hackathon', 'study'];
  const outdoorTypes = ['hiking'];
  const gamingTypes = ['gaming'];

  if (sportTypes.includes(activityType)) return '#f97316';
  if (fitnessTypes.includes(activityType)) return '#ef4444';
  if (socialTypes.includes(activityType)) return '#ec4899';
  if (creativeTypes.includes(activityType)) return '#a855f7';
  if (techTypes.includes(activityType)) return '#6366f1';
  if (outdoorTypes.includes(activityType)) return '#22c55e';
  if (gamingTypes.includes(activityType)) return '#14b8a6';
  return '#6366f1';
}

function createRequestMarkerIcon(request: RallyRequest): L.DivIcon {
  const emoji = getActivityEmoji(request.activity_type);
  const color = getActivityColor(request.activity_type);
  const avatarUrl = request.creator?.avatar_url;
  const initial = request.creator?.display_name?.charAt(0).toUpperCase() ?? '?';

  const avatarContent = avatarUrl
    ? `<img src="${avatarUrl}" alt="" class="w-full h-full object-cover rounded-full" />`
    : `<div class="w-full h-full rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-bold text-indigo-700">${initial}</div>`;

  const html = `
    <div class="request-marker" style="--ring-color: ${color}" role="img" aria-label="Rally request for ${request.activity_type}">
      <div class="request-marker-avatar">
        ${avatarContent}
      </div>
      <span class="request-marker-emoji">${emoji}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

export function RequestMarker({ request, onSelect }: RequestMarkerProps) {
  const icon = createRequestMarkerIcon(request);

  return (
    <Marker
      position={[request.location.lat, request.location.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(request),
      }}
    >
      <Popup>
        <div className="text-sm font-medium">
          {request.creator?.display_name ?? 'Someone'} wants to {getActivityEmoji(request.activity_type)} {request.activity_type}
        </div>
      </Popup>
    </Marker>
  );
}
