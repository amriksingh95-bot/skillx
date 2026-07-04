const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');


if (!process.env.JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET environment variable is not set. Server cannot start.');
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters for production security.');
}
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to authenticate requests via JWT.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;
    let isSSEToken = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      // Only allow short-lived SSE tokens in query params, never the main access token
      token = req.query.token;
      isSSEToken = true;
    }

    if (!token) {
      const err = new Error('Access token is missing or invalid.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      const err = new Error(e.name === 'TokenExpiredError' ? 'Access token has expired.' : 'Invalid access token.');
      err.status = 401;
      err.code = e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
      return next(err);
    }

    // SSE tokens (query param) must have purpose: 'sse' and cannot be used as access tokens
    if (isSSEToken && decoded.purpose !== 'sse') {
      const err = new Error('Invalid token type for query parameter. Only SSE tokens are allowed.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    // Main access tokens (Authorization header) must not be SSE tokens
    if (!isSSEToken && decoded.purpose === 'sse') {
      const err = new Error('SSE token cannot be used as an access token.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    // Query active status and load related entity IDs
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        merchant: true,
        customer: true
      }
    });

    if (!user) {
      const err = new Error('User not found.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    if (!user.isActive) {
      const isDeactivated = user.merchant?.status === 'deactivated';
      const errMsg = isDeactivated
        ? 'Your account has been permanently deactivated. Please contact support.'
        : 'Your account has been suspended. Please contact support.';
      const errCode = isDeactivated ? 'ACCOUNT_DEACTIVATED' : 'ACCOUNT_SUSPENDED';

      const err = new Error(errMsg);
      err.status = 403;
      err.code = errCode;
      return next(err);
    }

    req.user = {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      merchantId: user.merchant?.id || null,
      customerId: user.customer?.id || null
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to authorize access based on user role.
 * @param {...string} roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const err = new Error('Access denied. You do not have permission.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }
    next();
  };
}

/**
 * Middleware to gate merchant routes by subscription/account status.
 */
async function requireActiveMerchant(req, res, next) {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user.id },
      select: { id: true, status: true }
    });

    if (!merchant) {
      const err = new Error('Merchant account not found.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }

    switch (merchant.status) {
      case 'pending':
        const err1 = new Error('Your application is pending admin review. You will be notified once approved.');
        err1.status = 403;
        err1.code = 'ACCOUNT_PENDING';
        return next(err1);
      case 'approved':
        const err2 = new Error('Your application is approved. Please login and complete subscription payment of \u20B9399 to activate your account.');
        err2.status = 403;
        err2.code = 'PAYMENT_REQUIRED';
        return next(err2);
      case 'payment_pending':
        const err3 = new Error('Your payment screenshot has been received. Admin is verifying your payment.');
        err3.status = 403;
        err3.code = 'PAYMENT_UNDER_VERIFICATION';
        return next(err3);
      case 'suspended':
        const err4 = new Error('Your account has been suspended. Please contact admin.');
        err4.status = 403;
        err4.code = 'ACCOUNT_SUSPENDED';
        return next(err4);
      case 'deactivated':
        const err5 = new Error('Your account has been deactivated. Please contact admin.');
        err5.status = 403;
        err5.code = 'ACCOUNT_DEACTIVATED';
        return next(err5);
      default:
        return next();
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to authenticate requests via JWT (merchant or customer).
 */
async function authenticateAny(req, res, next) {
  try {
    let token = null;
    let isSSEToken = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
      isSSEToken = true;
    }

    if (!token) {
      const err = new Error('Access token is missing or invalid.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      const err = new Error(e.name === 'TokenExpiredError' ? 'Access token has expired.' : 'Invalid access token.');
      err.status = 401;
      err.code = e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
      return next(err);
    }

    if (isSSEToken && decoded.purpose !== 'sse') {
      const err = new Error('Invalid token type for query parameter. Only SSE tokens are allowed.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    if (!isSSEToken && decoded.purpose === 'sse') {
      const err = new Error('SSE token cannot be used as an access token.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        merchant: true,
        customer: true
      }
    });

    if (!user) {
      const err = new Error('User not found.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    if (!user.isActive) {
      const isDeactivated = user.merchant?.status === 'deactivated';
      const errMsg = isDeactivated
        ? 'Your account has been permanently deactivated. Please contact support.'
        : 'Your account has been suspended. Please contact support.';
      const errCode = isDeactivated ? 'ACCOUNT_DEACTIVATED' : 'ACCOUNT_SUSPENDED';

      const err = new Error(errMsg);
      err.status = 403;
      err.code = errCode;
      return next(err);
    }

    req.user = {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      merchantId: user.merchant?.id || null,
      customerId: user.customer?.id || null
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticate,
  authenticateAny,
  authorize,
  requireActiveMerchant
};
