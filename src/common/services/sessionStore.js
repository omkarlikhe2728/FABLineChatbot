const logger = require('../utils/logger');

class SessionStore {
  constructor() {
    this.sessions = new Map(); // Key: {botId}:{userId}
  }

  createSession(botId, userId, initialData = {}) {
    const sessionKey = this.getSessionKey(botId, userId);
    const session = {
      botId,
      userId,
      dialogState: 'MAIN_MENU',
      attributes: initialData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.sessions.set(sessionKey, session);
    logger.debug(`Session created: ${sessionKey}`);

    // Auto-expire session
    const timeout = initialData.sessionTimeout || 300000;
    setTimeout(() => {
      this.deleteSession(botId, userId);
    }, timeout);

    return session;
  }

  getSession(botId, userId) {
    const sessionKey = this.getSessionKey(botId, userId);
    const session = this.sessions.get(sessionKey);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session || null;
  }

  updateSession(botId, userId, updates) {
    const sessionKey = this.getSessionKey(botId, userId);
    const session = this.sessions.get(sessionKey);
    if (session) {
      Object.assign(session, updates, { lastActivity: Date.now() });
      logger.debug(`Session updated: ${sessionKey}`, { updates });
    }
  }

  deleteSession(botId, userId) {
    const sessionKey = this.getSessionKey(botId, userId);
    const deleted = this.sessions.delete(sessionKey);
    if (deleted) {
      logger.debug(`Session deleted: ${sessionKey}`);
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
