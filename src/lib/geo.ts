// Haversine formula for calculating distance between two points
export function calculateDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function isWithinRadius(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusKm: number
): boolean {
  return calculateDistance(point, center) <= radiusKm;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}
