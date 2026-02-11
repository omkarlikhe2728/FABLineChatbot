const logger = require('../utils/logger');

// In-memory store (use Redis in production)
const sessions = new Map();

class SessionService {
  async createSession(userId) {
    const session = {
      userId,
      dialogState: 'MAIN_MENU',
      attributes: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    sessions.set(userId, session);
    logger.info(`Session created for user ${userId}`);

    // Auto-expire session
    setTimeout(() => {
      sessions.delete(userId);
      logger.info(`Session expired for user ${userId}`);
    }, parseInt(process.env.SESSION_TIMEOUT || '300000'));

    return session;
  }

  async getSession(userId) {
    return sessions.get(userId) || null;
  }

  async updateDialogState(userId, dialogState) {
    const session = sessions.get(userId);
    if (session) {
      session.dialogState = dialogState;
      session.lastActivity = Date.now();
      logger.debug(`Dialog state: ${dialogState} for user ${userId}`);
    }
  }

  async updateAttributes(userId, newAttributes) {
    const session = sessions.get(userId);
    if (session) {
      session.attributes = { ...session.attributes, ...newAttributes };
      session.lastActivity = Date.now();
    }
  }

  async updateLastActivity(userId) {
    const session = sessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  async deleteSession(userId) {
    sessions.delete(userId);
    logger.info(`Session deleted for user ${userId}`);
  }

  async getSessionData(userId) {
    const session = sessions.get(userId);
    return session ? { ...session } : null;
  }
}

module.exports = new SessionService();
