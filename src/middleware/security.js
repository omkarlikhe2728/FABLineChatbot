const logger = require('../utils/logger');

class SecurityMiddleware {
  // Track requests per user
  static userRequests = new Map();

  static checkRateLimit(userId, maxRequests = 30, timeWindow = 60000) {
    const now = Date.now();
    const key = userId;

    if (!this.userRequests.has(key)) {
      this.userRequests.set(key, []);
    }

    const requests = this.userRequests.get(key);
    const recentRequests = requests.filter((time) => now - time < timeWindow);

    if (recentRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for user ${userId}`);
      return false;
    }

    recentRequests.push(now);
    this.userRequests.set(key, recentRequests);
    return true;
  }

  static validateInput(input, maxLength = 1000) {
    if (!input || typeof input !== 'string') {
      return false;
    }

    if (input.length > maxLength) {
      logger.warn(`Input exceeds max length: ${input.length}`);
      return false;
    }

    // Check for malicious patterns
    const maliciousPatterns = [/<script/i, /javascript:/i, /onerror=/i];
    if (maliciousPatterns.some((pattern) => pattern.test(input))) {
      logger.warn('Malicious input detected');
      return false;
    }

    return true;
  }
}

module.exports = SecurityMiddleware;
