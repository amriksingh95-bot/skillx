/**
 * Global error handler middleware for Express.
 */
function errorHandler(err, req, res, next) {

  let status = err.status || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred.';

  // Prevent raw database/Prisma details leaking to the client
  if (err.name && (err.name.startsWith('Prisma') || err.name.includes('Prisma'))) {
    status = 400;
    code = 'DATABASE_ERROR';
    message = 'A database error occurred. Please verify your inputs or try again later.';
  }

  // 1. Log the error securely to the server console
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${req.method} ${req.originalUrl} - Status: ${status}`);
  console.error(`Message: ${err.message}`);
  if (err.stack) {
    console.error(`Stack: ${err.stack}`);
  }

  // 2. Send safe response to client
  res.status(status).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    ...(err.retryAfter !== undefined ? { retryAfter: err.retryAfter } : {}),
    ...(err.attemptsRemaining !== undefined ? { attemptsRemaining: err.attemptsRemaining } : {})
  });
}

module.exports = errorHandler;
