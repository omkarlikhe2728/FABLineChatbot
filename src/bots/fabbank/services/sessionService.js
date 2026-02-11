const sessionStore = require('../../../common/services/sessionStore');
const logger = require('../../../common/utils/logger');

class FabBankSessionService {
  constructor(botId, config) {
    this.botId = botId;
    this.config = config;
  }

  async createSession(userId, initialData = {}) {
    return sessionStore.createSession(this.botId, userId, {
      ...initialData,
      sessionTimeout: this.config.sessionTimeout || 300000,
    });
  }

  async getSession(userId) {
    return sessionStore.getSession(this.botId, userId);
  }

  async updateDialogState(userId, dialogState) {
    sessionStore.updateSession(this.botId, userId, { dialogState });
    logger.debug(`[${this.botId}] Dialog state: ${dialogState} for user ${userId}`);
  }

  async updateAttributes(userId, newAttributes) {
    const session = sessionStore.getSession(this.botId, userId);
    if (session) {
      sessionStore.updateSession(this.botId, userId, {
        attributes: { ...session.attributes, ...newAttributes }
      });
    }
  }

  async updateLastActivity(userId) {
    sessionStore.updateSession(this.botId, userId, { lastActivity: Date.now() });
  }

  async deleteSession(userId) {
    sessionStore.deleteSession(this.botId, userId);
  }

  async getSessionData(userId) {
    const session = sessionStore.getSession(this.botId, userId);
    return session ? { ...session } : null;
  }
}

// Create default instance for backward compatibility
const defaultConfig = {
  sessionTimeout: parseInt(process.env.FABBANK_SESSION_TIMEOUT || '300000'),
};

const defaultInstance = new FabBankSessionService('fabbank', defaultConfig);

module.exports = defaultInstance;
