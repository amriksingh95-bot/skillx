/**
 * Shared relative-date helpers for demo fixtures.
 * Fixtures store day-offsets (numbers); the store materializes them to
 * absolute ISO timestamps using its own `now` so expiry windows stay
 * meaningful no matter when the demo is started.
 */

export function daysAgoIso(days, now) {
  const d = new Date(now.getTime());
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function daysFromIso(days, now) {
  const d = new Date(now.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
