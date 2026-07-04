const { validationResult } = require('express-validator');
const { validateAmount, validateMobile, validatePassword, validateLoginIdentifier } = require('../src/middleware/validators');

describe('Validators', () => {
  describe('validateAmount', () => {
    it('rejects zero amount', async () => {
      const req = { body: { purchaseAmount: 0 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validateAmount(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it('rejects negative amount', async () => {
      const req = { body: { purchaseAmount: -5 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validateAmount(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it('accepts valid amount', async () => {
      const req = { body: { purchaseAmount: 100 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validateAmount(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });
  });

  describe('validateMobile', () => {
    it('rejects mobile not starting with 6-9', async () => {
      const req = { body: { mobile: '5123456789' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validateMobile.run(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it('rejects short mobile', async () => {
      const req = { body: { mobile: '912345678' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validateMobile.run(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it('accepts valid 10-digit mobile starting with 6-9', async () => {
      const req = { body: { mobile: '9876543210' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validateMobile.run(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('rejects weak password', async () => {
      const req = { body: { password: 'weak' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validatePassword.run(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it('accepts strong password', async () => {
      const req = { body: { password: 'StrongP@ss1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validatePassword.run(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });
  });

  describe('validateLoginIdentifier', () => {
    it('accepts valid email', async () => {
      const req = { body: { identifier: 'test@example.com' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validateLoginIdentifier.run(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it('accepts valid mobile', async () => {
      const req = { body: { identifier: '9876543210' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validateLoginIdentifier.run(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it('rejects invalid identifier', async () => {
      const req = { body: { identifier: 'not-valid' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await validateLoginIdentifier.run(req, res, next);
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });
  });
});
