const logger = require('../utils/logger');

class SessionStore {
  constructor() {
    this.sessions = new Map(); // Key: {botId}:{userId}
    this.timers = new Map(); // Key: {botId}:{userId} -> timer ID
  }

  createSession(botId, userId, initialData = {}) {
    const sessionKey = this.getSessionKey(botId, userId);

    // Clear any existing timer for this session
    this._clearTimer(sessionKey);

    const session = {
      botId,
      userId,
      dialogState: 'MAIN_MENU',
      attributes: initialData,
      createdAt: Date.now(),
      lastActivity: null, // Set to null for new sessions - used to detect first message
      sessionTimeout: initialData.sessionTimeout || 300000,
    };

    this.sessions.set(sessionKey, session);
    logger.debug(`Session created: ${sessionKey}`);

    // Auto-expire session after inactivity
    this._resetTimer(sessionKey, session.sessionTimeout);

    return session;
  }

  getSession(botId, userId) {
    const sessionKey = this.getSessionKey(botId, userId);
    const session = this.sessions.get(sessionKey);
    if (session) {
      session.lastActivity = Date.now();
      // Reset inactivity timer on every access
      this._resetTimer(sessionKey, session.sessionTimeout);
    }
    return session || null;
  }

  updateSession(botId, userId, updates) {
    const sessionKey = this.getSessionKey(botId, userId);
    const session = this.sessions.get(sessionKey);
    if (session) {
      Object.assign(session, updates, { lastActivity: Date.now() });
      // Reset inactivity timer on every update
      this._resetTimer(sessionKey, session.sessionTimeout);
      logger.debug(`Session updated: ${sessionKey}`, { updates });
    }
  }

  deleteSession(botId, userId) {
    const sessionKey = this.getSessionKey(botId, userId);
    this._clearTimer(sessionKey);
    const deleted = this.sessions.delete(sessionKey);
    if (deleted) {
      logger.debug(`Session deleted: ${sessionKey}`);
    }
  }

  _resetTimer(sessionKey, timeout) {
    this._clearTimer(sessionKey);
    const timer = setTimeout(() => {
      const session = this.sessions.get(sessionKey);
      if (session) {
        logger.info(`Session expired due to inactivity: ${sessionKey} (timeout: ${timeout}ms)`);
        this.sessions.delete(sessionKey);
        this.timers.delete(sessionKey);
      }
    }, timeout);
    this.timers.set(sessionKey, timer);
  }

  _clearTimer(sessionKey) {
    const existingTimer = this.timers.get(sessionKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(sessionKey);
    }
  }

  getSessionKey(botId, userId) {
    return `${botId}:${userId}`;
  }

  // Get all sessions for a bot
  getBotSessions(botId) {
    const sessions = [];
    for (const [key, session] of this.sessions.entries()) {
      if (session.botId === botId) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  // Get all active sessions
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  // Clear all sessions for a bot
  clearBotSessions(botId) {
    let count = 0;
    for (const [key, session] of this.sessions.entries()) {
      if (session.botId === botId) {
        this.sessions.delete(key);
        count++;
      }
    }
    logger.info(`Cleared ${count} sessions for bot: ${botId}`);
    return count;
  }

  // Session exists check
  sessionExists(botId, userId) {
    const sessionKey = this.getSessionKey(botId, userId);
    return this.sessions.has(sessionKey);
  }
}

module.exports = new SessionStore();
