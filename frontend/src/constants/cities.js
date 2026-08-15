/**
 * Canonical city definitions — Frontend copy.
 *
 * Mirrors backend/src/constants/cities.js.
 * Import from here in all frontend components.
 *
 * State is always Punjab — no dropdown needed.
 */

export const STATE = 'Punjab';

export const CITIES = ['Ludhiana', 'Jalandhar', 'Amritsar'];

export const CITY_CENTERS = {
  Ludhiana: { lat: 30.901, lng: 75.8573 },
  Jalandhar: { lat: 31.326, lng: 75.5762 },
  Amritsar: { lat: 31.634, lng: 74.8723 }
};

const CITY_CENTER_ENTRIES = Object.entries(CITY_CENTERS);

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestCity(lat, lng) {
  let best = CITIES[0];
  let bestDist = Infinity;
  for (const [city, center] of CITY_CENTER_ENTRIES) {
    const dist = haversineKm(lat, lng, center.lat, center.lng);
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  }
  return best;
}
