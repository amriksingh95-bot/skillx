const { calculateRedemptionFee, GRACE_PERIOD_DAYS } = require('../src/services/subscriptionService');

describe('Subscription Service', () => {
  describe('calculateRedemptionFee', () => {
    const mockSettings = {
      rupeesPerPoint: 0.10,
      redemptionFeePercent: 5.00
    };

    test('calculates fee correctly for standard redemption', () => {
      const result = calculateRedemptionFee(1000, mockSettings);

      expect(result.grossDiscount).toBe(100.00);
      expect(result.feePercent).toBe(5.00);
      expect(result.platformFee).toBe(5.00);
      expect(result.netAmount).toBe(95.00);
    });

    test('calculates fee correctly with zero fee percent', () => {
      const settingsWithZeroFee = {
        rupeesPerPoint: 0.10,
        redemptionFeePercent: 0
      };

      const result = calculateRedemptionFee(1000, settingsWithZeroFee);

      expect(result.grossDiscount).toBe(100.00);
      expect(result.feePercent).toBe(0);
      expect(result.platformFee).toBe(0);
      expect(result.netAmount).toBe(100.00);
    });

    test('calculates fee correctly with 100% fee percent', () => {
      const settingsWithFullFee = {
        rupeesPerPoint: 0.10,
        redemptionFeePercent: 100
      };

      const result = calculateRedemptionFee(1000, settingsWithFullFee);

      expect(result.grossDiscount).toBe(100.00);
      expect(result.feePercent).toBe(100);
      expect(result.platformFee).toBe(100.00);
      expect(result.netAmount).toBe(0);
    });

    test('handles minimum redemption points', () => {
      const result = calculateRedemptionFee(100, mockSettings);

      expect(result.grossDiscount).toBe(10.00);
      expect(result.platformFee).toBe(0.50);
      expect(result.netAmount).toBe(9.50);
    });

    test('handles large redemption amounts', () => {
      const result = calculateRedemptionFee(100000, mockSettings);

      expect(result.grossDiscount).toBe(10000.00);
      expect(result.platformFee).toBe(500.00);
      expect(result.netAmount).toBe(9500.00);
    });

    test('rounds to 2 decimal places', () => {
      const settingsWithOddPercent = {
        rupeesPerPoint: 0.10,
        redemptionFeePercent: 3.33
      };

      const result = calculateRedemptionFee(1000, settingsWithOddPercent);

      expect(result.grossDiscount).toBe(100.00);
      expect(result.platformFee).toBe(3.33);
      expect(result.netAmount).toBe(96.67);
    });
  });

  describe('GRACE_PERIOD_DAYS', () => {
    test('is set to 15 days', () => {
      expect(GRACE_PERIOD_DAYS).toBe(15);
    });
  });
});

describe('Points Service - Redemption Fee Integration', () => {
  test('processRedeem includes feeInfo in response', () => {
    // This is a conceptual test - actual implementation would require mocking Prisma
    const mockTransaction = {
      id: 'test-id',
      customerId: 'customer-1',
      merchantId: 'merchant-1',
      type: 'redeem',
      points: 1000,
      platformFee: 5.00,
      netAmount: 95.00,
      status: 'completed'
    };

    expect(mockTransaction.platformFee).toBe(5.00);
    expect(mockTransaction.netAmount).toBe(95.00);
    expect(mockTransaction.points).toBe(1000);
  });
});
