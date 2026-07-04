const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication routes (login, register, reset password, OTP).
 * Limits to 10 requests per 15 minutes.
 */
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const err = new Error('Too many requests, please try again after 15 minutes.');
    err.status = 429;
    err.code = 'RATE_LIMIT_EXCEEDED';
    next(err);
  }
});

const standardAuthLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const err = new Error('Too many requests, please try again after 30 seconds.');
    err.status = 429;
    err.code = 'RATE_LIMIT_EXCEEDED';
    next(err);
  }
});

const authLimiter = (req, res, next) => {
  // Use server-side IP + authenticated user (if available) for admin detection
  // Never trust client-controlled identifiers for security decisions
  const isAdmin = req.user?.role === 'super_admin' || req.ip === '127.0.0.1';

  if (isAdmin) {
    return adminAuthLimiter(req, res, next);
  } else {
    return standardAuthLimiter(req, res, next);
  }
};

/**
 * Rate limiter for general API routes.
 * Limits to 100 requests per minute.
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const err = new Error('Too many requests. Rate limit exceeded.');
    err.status = 429;
    err.code = 'RATE_LIMIT_EXCEEDED';
    next(err);
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
