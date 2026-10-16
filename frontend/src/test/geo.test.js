import { describe, it, expect } from 'vitest';
import { isValidLatLng, buildDirectionsUrl } from '../utils/geo';

describe('utils/geo — isValidLatLng', () => {
  it('accepts finite in-range coordinates (demo + real merchant values)', () => {
    expect(isValidLatLng(30.9042, 75.8593)).toBe(true);
    expect(isValidLatLng(31.3285, 75.5791)).toBe(true);
    expect(isValidLatLng(-33.8688, 151.2093)).toBe(true);
    expect(isValidLatLng(0.1, 0.1)).toBe(true);
  });

  it('rejects null/undefined/empty (Number(null) === 0 trap)', () => {
    expect(isValidLatLng(null, 75.8593)).toBe(false);
    expect(isValidLatLng(30.9, null)).toBe(false);
    expect(isValidLatLng(undefined, 75.8593)).toBe(false);
    expect(isValidLatLng(30.9, undefined)).toBe(false);
    expect(isValidLatLng('', '')).toBe(false);
  });

  it('rejects non-finite and out-of-range values', () => {
    expect(isValidLatLng(NaN, 75.8)).toBe(false);
    expect(isValidLatLng(30.9, NaN)).toBe(false);
    expect(isValidLatLng(Infinity, 75.8)).toBe(false);
    expect(isValidLatLng(91, 75.8)).toBe(false);
    expect(isValidLatLng(30.9, 181)).toBe(false);
    expect(isValidLatLng(-91, -181)).toBe(false);
    expect(isValidLatLng('not-a-number', 75.8)).toBe(false);
  });

  it('rejects zero-valued lat or lng (parity with legacy truthy checks)', () => {
    expect(isValidLatLng(0, 75.8593)).toBe(false);
    expect(isValidLatLng(30.9042, 0)).toBe(false);
    expect(isValidLatLng(0, 0)).toBe(false);
  });
});

describe('utils/geo — buildDirectionsUrl', () => {
  it('returns the canonical Google Maps dir URL for valid coordinates', () => {
    expect(buildDirectionsUrl(30.9042, 75.8593)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=30.9042,75.8593'
    );
    expect(buildDirectionsUrl(31.3285, 75.5791)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=31.3285,75.5791'
    );
  });

  it('returns null when coordinates are invalid', () => {
    expect(buildDirectionsUrl(null, null)).toBeNull();
    expect(buildDirectionsUrl(null, 75.8593)).toBeNull();
    expect(buildDirectionsUrl(91, 75.8)).toBeNull();
    expect(buildDirectionsUrl(30.9, 181)).toBeNull();
    expect(buildDirectionsUrl(0, 0)).toBeNull();
    expect(buildDirectionsUrl('x', 'y')).toBeNull();
  });
});
