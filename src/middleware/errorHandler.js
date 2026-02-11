const logger = require('../utils/logger');

class ErrorHandler {
  handle(err, req, res, next) {
    logger.error('Unhandled error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
      success: false,
      message: statusCode === 500 ? 'An error occurred' : message,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new ErrorHandler();
