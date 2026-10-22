import { describe, it, expect } from 'vitest';
import {
  computeBillCapPoints,
  computeMaxRedeemablePoints,
  isBillTooSmall
} from '../pages/merchant/MerchantRedeemPoints';

// Bug scenario: 225 points balance, ₹0.10/point (₹10 discount = 100 pts).
const RATE = 0.10;
const MIN = 100;

describe('computeBillCapPoints (cap = 100% of bill)', () => {
  it('floors the bill / rate (₹11 bill -> 110 points max)', () => {
    expect(computeBillCapPoints(11, RATE)).toBe(110);
  });

  it('returns Infinity when there is no valid bill (no cap; balance-only)', () => {
    expect(computeBillCapPoints('', RATE)).toBe(Infinity);
    expect(computeBillCapPoints(null, RATE)).toBe(Infinity);
    expect(computeBillCapPoints(0, RATE)).toBe(Infinity);
    expect(computeBillCapPoints('abc', RATE)).toBe(Infinity);
  });
});

describe('computeMaxRedeemablePoints (min of balance and bill cap)', () => {
  it('is balance-limited on a big bill (₹500 bill, 225 balance -> 225)', () => {
    expect(computeMaxRedeemablePoints({ balance: 225, billAmount: 500, rate: RATE })).toBe(225);
  });

  it('is bill-limited on a small bill (₹11 bill, 225 balance -> 110)', () => {
    // Previously returned 225 -> ₹112.50 discount on an ₹11 bill.
    expect(computeMaxRedeemablePoints({ balance: 225, billAmount: 11, rate: RATE })).toBe(110);
  });
});

describe('isBillTooSmall (allowed max below the 100-point minimum)', () => {
  it('flags a bill too small for the minimum redemption (₹11 bill -> max 110 >= 100, ok)', () => {
    // ₹11 bill allows 110 points, which is >= 100 minimum, so not "too small".
    expect(isBillTooSmall({ billAmount: 11, rate: RATE, minLimit: MIN })).toBe(false);
  });

  it('flags a genuinely-too-small bill (₹5 bill -> max 50 < 100)', () => {
    expect(isBillTooSmall({ billAmount: 5, rate: RATE, minLimit: MIN })).toBe(true);
  });

  it('does not flag when there is no valid bill yet', () => {
    expect(isBillTooSmall({ billAmount: '', rate: RATE, minLimit: MIN })).toBe(false);
  });
});
