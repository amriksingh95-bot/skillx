jest.mock('../src/lib/prisma', () => ({
  oTPVerification: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    create: jest.fn().mockResolvedValue({ id: 'test-id' }),
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({})
  },
  oTPAttempt: {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 })
  }
}));

jest.mock('../src/services/emailService', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true)
}));

const { generateAndSendOTP, verifyOTP } = require('../src/services/otpService');
const prisma = require('../src/lib/prisma');
const bcrypt = require('bcrypt');

describe('OTP Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAndSendOTP', () => {
    it('throws on invalid purpose', async () => {
      await expect(generateAndSendOTP('9876543210', null, 'invalid'))
        .rejects.toThrow('Invalid OTP purpose');
    });

    it('creates OTP record with correct purpose', async () => {
      await generateAndSendOTP('9876543210', null, 'register');
      expect(prisma.oTPVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mobile: '9876543210',
            purpose: 'register'
          })
        })
      );
    });

    it('returns the raw OTP', async () => {
      const result = await generateAndSendOTP('9876543210', null, 'reset');
      expect(result.otp).toBeDefined();
      expect(result.otp).toHaveLength(6);
      expect(/^\d{6}$/.test(result.otp)).toBe(true);
    });

    it('sends email when email is provided', async () => {
      const { sendOTPEmail } = require('../src/services/emailService');
      await generateAndSendOTP('9876543210', 'test@example.com', 'register');
      expect(sendOTPEmail).toHaveBeenCalledWith('test@example.com', expect.any(String), 'register');
    });

    it('does not send email when email is null', async () => {
      const { sendOTPEmail } = require('../src/services/emailService');
      await generateAndSendOTP('9876543210', null, 'register');
      expect(sendOTPEmail).not.toHaveBeenCalled();
    });

    it('cleans up old OTPs for same mobile+purpose before creating', async () => {
      await generateAndSendOTP('9876543210', null, 'change_mobile');
      expect(prisma.oTPVerification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { mobile: '9876543210', purpose: 'change_mobile', verified: false }
        })
      );
    });
  });

  describe('verifyOTP', () => {
    it('throws when purpose is missing', async () => {
      await expect(verifyOTP('9876543210', '123456'))
        .rejects.toThrow('OTP purpose is required');
    });

    it('throws when no record found', async () => {
      prisma.oTPVerification.findFirst.mockResolvedValueOnce(null);
      await expect(verifyOTP('9876543210', '123456', 'register'))
        .rejects.toThrow('OTP expired or not found');
    });

    it('throws when OTP is locked', async () => {
      prisma.oTPVerification.findFirst.mockResolvedValueOnce({ id: 'otp-id', otp: 'hashed' });
      prisma.oTPAttempt.findUnique.mockResolvedValueOnce({
        lockedUntil: new Date(Date.now() + 30000)
      });
      await expect(verifyOTP('9876543210', '123456', 'register'))
        .rejects.toThrow('Too many attempts');
    });

    it('returns true for valid OTP', async () => {
      const hashedOtp = await bcrypt.hash('123456', 10);
      prisma.oTPVerification.findFirst.mockResolvedValueOnce({
        id: 'otp-id',
        otp: hashedOtp
      });
      prisma.oTPAttempt.findUnique.mockResolvedValueOnce(null);

      const result = await verifyOTP('9876543210', '123456', 'register');
      expect(result).toBe(true);
    });

    it('marks record as verified on success', async () => {
      const hashedOtp = await bcrypt.hash('123456', 10);
      prisma.oTPVerification.findFirst.mockResolvedValueOnce({
        id: 'otp-id',
        otp: hashedOtp
      });
      prisma.oTPAttempt.findUnique.mockResolvedValueOnce(null);

      await verifyOTP('9876543210', '123456', 'register');
      expect(prisma.oTPVerification.update).toHaveBeenCalledWith({
        where: { id: 'otp-id' },
        data: { verified: true }
      });
    });

    it('increments attempt count on invalid OTP', async () => {
      const hashedOtp = await bcrypt.hash('123456', 10);
      prisma.oTPVerification.findFirst.mockResolvedValueOnce({
        id: 'otp-id',
        otp: hashedOtp
      });
      prisma.oTPAttempt.findUnique.mockResolvedValueOnce(null);

      await expect(verifyOTP('9876543210', '999999', 'register'))
        .rejects.toThrow('Invalid OTP');
      expect(prisma.oTPAttempt.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ attemptCount: 1 })
        })
      );
    });
  });
});
