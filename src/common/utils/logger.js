const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../../logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    const fullLog = Object.keys(data).length > 0
      ? `${logEntry} ${JSON.stringify(data)}`
      : logEntry;

    console.log(fullLog);

    // Write to file
    const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
    fs.appendFileSync(logFile, fullLog + '\n');
  }

  error(message, error) {
    this.log('ERROR', message, error instanceof Error
      ? { error: error.message, stack: error.stack }
      : error);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  debug(message, data) {
    this.log('DEBUG', message, data);
  }
}

module.exports = new Logger();
