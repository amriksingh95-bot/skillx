/**
 * Global error handler middleware for Express.
 */
function errorHandler(err, req, res, next) {


  let status = err.status || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred.';

  // Handle Multer errors (file uploads)
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    code = 'FILE_TOO_LARGE';
    message = 'File is too large. Maximum size is 5 MB.';
  } else if (err.message && err.message.includes('Only image files are allowed')) {
    status = 400;
    code = 'INVALID_FILE_TYPE';
    message = 'Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.';
  }

  // Prevent raw database/Prisma details leaking to the client
  if (err.name && (err.name.startsWith('Prisma') || err.name.includes('Prisma'))) {
    status = 400;
    code = 'DATABASE_ERROR';
    message = 'A database error occurred. Please verify your inputs or try again later.';
  }

  // 1. Log the error securely to the server console
  const timestamp = new Date().toISOString();
  const requestId = req.id || 'unknown';
  console.error(`[${timestamp}] [${requestId}] ERROR: ${req.method} ${req.originalUrl.split('?')[0]} - Status: ${status}`);
  console.error(`[${requestId}] Message: ${err.message}`);
  if (err.stack) {
    console.error(`[${requestId}] Stack: ${err.stack}`);
  }

  // 2. Send safe response to client
  res.status(status).json({
    success: false,
    message,
    code,
    requestId,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    ...(err.retryAfter !== undefined ? { retryAfter: err.retryAfter } : {}),
    ...(err.attemptsRemaining !== undefined ? { attemptsRemaining: err.attemptsRemaining } : {})
  });
}

module.exports = errorHandler;
