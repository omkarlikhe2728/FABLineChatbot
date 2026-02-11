const sessionStore = require('../../../common/services/sessionStore');
const logger = require('../../../common/utils/logger');

const ANA_BOT_ID = 'ana';

class AnaSessionService {
  /**
   * Create a new session for a user
   */
  createSession(userId, initialData = {}) {
    logger.info(`Creating session for ANA user ${userId}`);
    const session = sessionStore.createSession(ANA_BOT_ID, userId, {
      dialogState: 'MAIN_MENU',
      attributes: initialData,
    });
    return session;
  }

  /**
   * Get user's session
   */
  getSession(userId) {
    return sessionStore.getSession(ANA_BOT_ID, userId);
  }

  /**
   * Update session state
   */
  setState(userId, newState) {
    const session = this.getSession(userId);
    if (session) {
      session.dialogState = newState;
      logger.debug(`ANA session state updated for ${userId}: ${newState}`);
    }
  }

  /**
   * Get current state
   */
  getState(userId) {
    const session = this.getSession(userId);
    return session ? session.dialogState : null;
  }

  /**
   * Set attribute in session
   */
  setAttribute(userId, key, value) {
    const session = this.getSession(userId);
    if (session) {
      session.attributes[key] = value;
      logger.debug(`ANA session attribute set for ${userId}: ${key}`);
    }
  }

  /**
   * Get attribute from session
   */
  getAttribute(userId, key) {
    const session = this.getSession(userId);
    return session ? session.attributes[key] : null;
  }

  /**
   * Clear entire session
   */
  clearSession(userId) {
    sessionStore.deleteSession(ANA_BOT_ID, userId);
    logger.info(`ANA session cleared for ${userId}`);
  }

  /**
   * Auto-create session if doesn't exist
   */
  ensureSession(userId) {
    let session = this.getSession(userId);
    if (!session) {
      session = this.createSession(userId, {});
    }
    return session;
  }
}

// Create singleton instance
const defaultInstance = new AnaSessionService();

module.exports = defaultInstance;
