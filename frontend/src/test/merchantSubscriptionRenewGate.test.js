import { describe, it, expect } from 'vitest';
import { canShowRenewButton, isRenewalPendingVerification } from '../pages/merchant/MerchantSubscription';

describe('canShowRenewButton (Renew gate)', () => {
  it('shows Renew for active, grace_period and expired merchants', () => {
    expect(canShowRenewButton('active', 'active')).toBe(true);
    expect(canShowRenewButton('grace_period', 'active')).toBe(true);
    expect(canShowRenewButton('expired', 'active')).toBe(true);
  });

  it('hides Renew for none and cancelled subscription statuses', () => {
    expect(canShowRenewButton('none', 'active')).toBe(false);
    expect(canShowRenewButton('cancelled', 'active')).toBe(false);
  });

  it('hides Renew when merchantStatus is payment_pending', () => {
    expect(canShowRenewButton('active', 'payment_pending')).toBe(false);
    expect(canShowRenewButton('grace_period', 'payment_pending')).toBe(false);
    expect(canShowRenewButton('expired', 'payment_pending')).toBe(false);
  });
});

describe('isRenewalPendingVerification (pending label gate)', () => {
  it('shows the pending label for active/grace/expired when payment_pending', () => {
    expect(isRenewalPendingVerification('active', 'payment_pending')).toBe(true);
    expect(isRenewalPendingVerification('grace_period', 'payment_pending')).toBe(true);
    expect(isRenewalPendingVerification('expired', 'payment_pending')).toBe(true);
  });

  it('hides the pending label for none/cancelled or non-pending merchantStatus', () => {
    expect(isRenewalPendingVerification('none', 'payment_pending')).toBe(false);
    expect(isRenewalPendingVerification('cancelled', 'payment_pending')).toBe(false);
    expect(isRenewalPendingVerification('expired', 'active')).toBe(false);
  });
});
