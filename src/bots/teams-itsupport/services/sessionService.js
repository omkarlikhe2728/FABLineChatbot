const sessionStore = require('../../../common/services/sessionStore');
const logger = require('../../../common/utils/logger');

class SessionService {
  constructor(config) {
    this.botId = 'teams-itsupport';
    this.sessionTimeout = config.sessionTimeout;
    logger.info(`SessionService initialized for ${this.botId} with timeout ${this.sessionTimeout}ms`);
  }

  /**
   * Create a new session for a Teams user
   */
  createSession(userId, initialData = {}) {
    try {
      const session = sessionStore.createSession(
        this.botId,
        userId,
        {
          dialogState: 'MAIN_MENU',
          conversationReference: null,
          ...initialData
        },
        this.sessionTimeout
      );
      logger.info(`Created session for user ${userId}`);
      return session;
    } catch (error) {
      logger.error(`Error creating session for ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get existing session
   */
  getSession(userId) {
    try {
      const session = sessionStore.getSession(this.botId, userId);
      if (session) {
        logger.debug(`Retrieved session for user ${userId}, state: ${session.dialogState}`);
      }
      return session;
    } catch (error) {
      logger.error(`Error getting session for ${userId}`, error);
      return null;
    }
  }

  /**
   * Update dialog state
   */
  updateDialogState(userId, newState) {
    try {
      sessionStore.updateSession(this.botId, userId, { dialogState: newState });
      logger.debug(`Updated dialog state to ${newState} for user ${userId}`);
    } catch (error) {
      logger.error(`Error updating dialog state for ${userId}`, error);
    }
  }

  /**
   * Update session attributes
   */
  updateAttributes(userId, attrs) {
    try {
      const session = sessionStore.getSession(this.botId, userId);
      if (session) {
        const updatedAttrs = {
          ...session.attributes,
          ...attrs
        };
        sessionStore.updateSession(this.botId, userId, { attributes: updatedAttrs });
        logger.debug(`Updated attributes for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error updating attributes for ${userId}`, error);
    }
  }

  /**
   * Store conversation reference for proactive messaging
   */
  updateConversationReference(userId, activity) {
    try {
      // Store the entire activity as conversation reference
      const session = sessionStore.getSession(this.botId, userId);
      if (session) {
        const updatedAttrs = {
          ...session.attributes,
          conversationReference: activity
        };
        sessionStore.updateSession(this.botId, userId, { attributes: updatedAttrs });
        logger.debug(`Stored conversation reference for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error updating conversation reference for ${userId}`, error);
    }
  }

  /**
   * Delete session
   */
  deleteSession(userId) {
    try {
      sessionStore.deleteSession(this.botId, userId);
      logger.info(`Deleted session for user ${userId}`);
    } catch (error) {
      logger.error(`Error deleting session for ${userId}`, error);
    }
  }

  /**
   * Get session key
   */
  getSessionKey(userId) {
    return `${this.botId}:${userId}`;
  }
}

module.exports = SessionService;
