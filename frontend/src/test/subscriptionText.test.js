import { describe, it, expect } from 'vitest';
import { expiredDaysAgoLabel, ribbonSubscriptionText, expiryDatePrefix } from '../utils/subscriptionText';

const DAY = 86400000;

function iso(daysFromNow) {
  return new Date(Date.now() + daysFromNow * DAY);
}

describe('expiredDaysAgoLabel', () => {
  it('formats a positive day count', () => {
    expect(expiredDaysAgoLabel(25)).toBe('Expired 25 days ago');
  });

  it('formats a single day', () => {
    expect(expiredDaysAgoLabel(1)).toBe('Expired 1 days ago');
  });

  it('returns null for null/undefined', () => {
    expect(expiredDaysAgoLabel(null)).toBeNull();
    expect(expiredDaysAgoLabel(undefined)).toBeNull();
  });

  it('returns null for NaN or negative values', () => {
    expect(expiredDaysAgoLabel(NaN)).toBeNull();
    expect(expiredDaysAgoLabel(-3)).toBeNull();
  });
});

describe('ribbonSubscriptionText', () => {
  it('returns empty string without an endDate', () => {
    expect(ribbonSubscriptionText(null)).toBe('');
    expect(ribbonSubscriptionText({ status: 'none' })).toBe('');
  });

  it('shows days-ago text for expired status with daysExpired', () => {
    const text = ribbonSubscriptionText({
      status: 'expired',
      endDate: iso(-25),
      daysExpired: 25
    });
    expect(text).toContain('25 days ago');
    expect(text).toContain('renew now');
    expect(text).toContain('Your subscription');
  });

  it('falls back to the date text when expired but daysExpired is missing', () => {
    const text = ribbonSubscriptionText({
      status: 'expired',
      endDate: iso(-25),
      daysExpired: null
    });
    expect(text).toContain('expired on');
    expect(text).toContain('renew now');
  });

  it('keeps existing "expires on" text for active subscriptions within 3 days', () => {
    const text = ribbonSubscriptionText({
      status: 'active',
      endDate: iso(2)
    });
    expect(text).toContain('expires on');
    expect(text).toContain('renew now');
  });

  it('keeps existing "expired on" text for grace-period merchants', () => {
    const text = ribbonSubscriptionText({
      status: 'grace_period',
      endDate: iso(-5),
      gracePeriodEnd: iso(10)
    });
    expect(text).toContain('expired on');
    expect(text).toContain('renew now');
  });

  it('renders a real date string for date-based text', () => {
    const text = ribbonSubscriptionText({
      status: 'active',
      endDate: iso(2)
    });
    expect(text).toMatch(/Your subscription expires on .+ — renew now/);
  });
});

describe('expiryDatePrefix', () => {
  it('returns "Expired" only for expired status', () => {
    expect(expiryDatePrefix('expired')).toBe('Expired');
  });

  it('keeps "Expires" for every other status', () => {
    expect(expiryDatePrefix('active')).toBe('Expires');
    expect(expiryDatePrefix('grace_period')).toBe('Expires');
    expect(expiryDatePrefix('none')).toBe('Expires');
    expect(expiryDatePrefix('cancelled')).toBe('Expires');
    expect(expiryDatePrefix(undefined)).toBe('Expires');
  });
});
