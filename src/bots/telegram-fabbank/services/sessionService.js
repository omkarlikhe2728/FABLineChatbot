const SessionStore = require('../../../common/services/sessionStore');
const logger = require('../../../common/utils/logger');

class TelegramFabBankSessionService {
  constructor() {
    this.botId = 'telegram-fabbank';
  }

  createSession(chatId, initialAttributes = {}) {
    try {
      const session = SessionStore.createSession(
        this.botId,
        String(chatId),
        {
          dialogState: 'MAIN_MENU',
          attributes: initialAttributes,
          createdAt: new Date()
        }
      );
      logger.info(`Session created for ${this.botId}:${chatId}`);
      return session;
    } catch (error) {
      logger.error(`Error creating session for ${chatId}:`, error);
      throw error;
    }
  }

  getSession(chatId) {
    try {
      // SessionStore.getSession automatically updates lastActivity
      const session = SessionStore.getSession(this.botId, String(chatId));
      return session;
    } catch (error) {
      logger.error(`Error getting session for ${chatId}:`, error);
      throw error;
    }
  }

  updateDialogState(chatId, newState) {
    try {
      const session = this.getSession(chatId);
      if (session) {
        session.dialogState = newState;
        SessionStore.updateSession(this.botId, String(chatId), { dialogState: newState });
      }
      return session;
    } catch (error) {
      logger.error(`Error updating dialog state for ${chatId}:`, error);
      throw error;
    }
  }

  updateAttributes(chatId, newAttributes) {
    try {
      const session = this.getSession(chatId);
      if (session) {
        SessionStore.updateSession(this.botId, String(chatId), { attributes: { ...session.attributes, ...newAttributes } });
      }
      return session;
    } catch (error) {
      logger.error(`Error updating attributes for ${chatId}:`, error);
      throw error;
    }
  }

  deleteSession(chatId) {
    try {
      SessionStore.deleteSession(this.botId, String(chatId));
      logger.info(`Session deleted for ${this.botId}:${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting session for ${chatId}:`, error);
      throw error;
    }
  }

  updateLastActivity(chatId) {
    try {
      // getSession automatically updates lastActivity
      this.getSession(chatId);
      return true;
    } catch (error) {
      logger.error(`Error updating last activity for ${chatId}:`, error);
      throw error;
    }
  }
}

module.exports = TelegramFabBankSessionService;
