const sessionStore = require('../../../common/services/sessionStore');
const logger = require('../../../common/utils/logger');

const SANDS_BOT_ID = 'sands';

class SandsSessionService {
  /**
   * Create a new session for a user
   */
  createSession(userId, initialData = {}) {
    logger.info(`Creating session for sands user ${userId}`);
    const session = sessionStore.createSession(SANDS_BOT_ID, userId, {
      dialogState: 'MAIN_MENU',
      attributes: initialData,
    });
    return session;
  }

  /**
   * Get user's session
   */
  getSession(userId) {
    return sessionStore.getSession(SANDS_BOT_ID, userId);
  }

  /**
   * Update session state
   */
  setState(userId, newState) {
    const session = this.getSession(userId);
    if (session) {
      session.dialogState = newState;
      logger.debug(`Sands session state updated for ${userId}: ${newState}`);
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
      logger.debug(`Sands session attribute set for ${userId}: ${key}`);
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
    sessionStore.deleteSession(SANDS_BOT_ID, userId);
    logger.info(`Sands session cleared for ${userId}`);
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
const defaultInstance = new SandsSessionService();

module.exports = defaultInstance;
