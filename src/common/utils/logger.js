const fs = require('fs');
const path = require('path');

/**
 * Production-Ready Logger
 * - Structured logging with levels (DEBUG, INFO, WARN, ERROR)
 * - Writes to log files in logs/ folder
 * - No sensitive data logging
 * - Log rotation support
 * - Configurable log levels
 */
class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../../logs');
    this.maxLogSize = 10 * 1024 * 1024; // 10 MB

    // Log level hierarchy: DEBUG < INFO < WARN < ERROR
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };

    // Current log level (can be set via environment variable)
    const envLogLevel = process.env.LOG_LEVEL || 'INFO';
    this.currentLevel = this.levels[envLogLevel] || this.levels.INFO;

    // Initialize log directory
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Format log entry with timestamp
   */
  formatLogEntry(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    return JSON.stringify(entry);
  }

  /**
   * Write to file with rotation support
   */
  writeToFile(level, content) {
    try {
      const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);

      // Check file size for rotation
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxLogSize) {
          this.rotateLog(logFile);
        }
      }

      // Write to level-specific file
      fs.appendFileSync(logFile, content + '\n', 'utf8');

      // Also write to combined.log for all events
      const combinedFile = path.join(this.logDir, 'combined.log');
      fs.appendFileSync(combinedFile, content + '\n', 'utf8');
    } catch (error) {
      // Silent fail to prevent logging from breaking the app
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  /**
   * Rotate log file when it exceeds max size
   */
  rotateLog(logFile) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dirname = path.dirname(logFile);
      const basename = path.basename(logFile, '.log');
      const archivePath = path.join(dirname, `${basename}-${timestamp}.log`);

      fs.renameSync(logFile, archivePath);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Check if message should be logged based on level
   */
  shouldLog(level) {
    return this.levels[level] >= this.currentLevel;
  }

  /**
   * Main logging function
   */
  log(level, message, data = null) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = this.formatLogEntry(level, message, data);

    // Console output in development mode (for visibility)
    if (process.env.NODE_ENV !== 'production') {
      const consoleOutput = `[${new Date().toISOString()}] [${level}] ${message}`;
      if (level === 'ERROR') {
        console.error(consoleOutput, data || '');
      } else if (level === 'WARN') {
        console.warn(consoleOutput, data || '');
      } else {
        console.log(consoleOutput, data || '');
      }
    }

    this.writeToFile(level, logEntry);
  }

  /**
   * Error logging - logs errors with stack traces
   */
  error(message, error = null) {
    const data = {};

    if (error) {
      if (error instanceof Error) {
        data.error = {
          message: error.message,
          stack: error.stack,
          name: error.name
        };
      } else if (typeof error === 'object') {
        data.error = error;
      } else {
        data.error = String(error);
      }
    }

    this.log('ERROR', message, Object.keys(data).length > 0 ? data : null);
  }

  /**
   * Warning logging
   */
  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  /**
   * Info logging - for important business events
   */
  info(message, data = null) {
    this.log('INFO', message, data);
  }

  /**
   * Debug logging - verbose for development
   */
  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  /**
   * Log HTTP request (sanitized for security)
   */
  logRequest(method, path, statusCode = null, duration = null) {
    const data = {
      method,
      path,
      ...(statusCode && { statusCode }),
      ...(duration && { duration: `${duration}ms` })
    };
    this.info('HTTP Request', data);
  }

  /**
   * Log webhook received (without sensitive data)
   */
  logWebhookReceived(botId, eventCount = null) {
    const data = {
      botId,
      ...(eventCount && { eventCount })
    };
    this.info('Webhook received', data);
  }

  /**
   * Log message sent (without content to protect privacy)
   */
  logMessageSent(botId, userId, messageType, platform = 'LINE') {
    this.debug('Message sent', {
      botId,
      userId,
      messageType,
      platform
    });
  }

  /**
   * Log session event
   */
  logSessionEvent(eventType, userId, data = null) {
    this.debug(`Session ${eventType}`, {
      userId,
      ...(data && { data })
    });
  }

  /**
   * Log API call (without request body to protect data)
   */
  logApiCall(method, endpoint, statusCode = null, duration = null) {
    const data = {
      method,
      endpoint,
      ...(statusCode && { statusCode }),
      ...(duration && { duration: `${duration}ms` })
    };
    this.debug('API Call', data);
  }

  /**
   * Log authentication event
   */
  logAuthEvent(eventType, userId = null, success = true) {
    const data = {
      eventType,
      ...(userId && { userId }),
      success
    };
    success ? this.info('Auth event', data) : this.warn('Auth event', data);
  }

  /**
   * Log dialog state change
   */
  logStateChange(userId, fromState, toState, botId = null) {
    this.debug('State changed', {
      userId,
      fromState,
      toState,
      ...(botId && { botId })
    });
  }

  /**
   * Set log level at runtime
   */
  setLogLevel(level) {
    if (this.levels[level]) {
      this.currentLevel = this.levels[level];
      this.info('Log level changed', { level });
    }
  }

  /**
   * Get current log level
   */
  getLogLevel() {
    return Object.keys(this.levels).find(key => this.levels[key] === this.currentLevel);
  }
}

module.exports = new Logger();
