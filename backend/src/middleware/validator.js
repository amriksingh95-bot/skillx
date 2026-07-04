const { validationResult } = require('express-validator');

/**
 * Middleware to check for express-validator results.
 * If validation fails, throws a VALIDATION_ERROR.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map(err => `${err.path || err.param}: ${err.msg}`).join('; ');
    const error = new Error(message);
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }
  next();
}

module.exports = {
  validate
};
