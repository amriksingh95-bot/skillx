/**
 * Shared geo helpers for map/directions links (FindPartners, AdBanner,
 * AdCard, demo merchant profile).
 *
 * Parity note: isValidLatLng rejects zero-valued lat or lng because every
 * current caller used truthy checks (e.g. `m.latitude && m.longitude`),
 * which treat 0 as "no coordinates". Real-user behaviour with valid
 * coordinates is unchanged in effect.
 */

export function isValidLatLng(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (lat === '' || lng === '') return false;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  if (la === 0 || ln === 0) return false;
  return la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
}

export function buildDirectionsUrl(lat, lng) {
  if (!isValidLatLng(lat, lng)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${Number(lat)},${Number(lng)}`;
}
