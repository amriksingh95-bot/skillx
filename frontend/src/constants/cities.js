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
