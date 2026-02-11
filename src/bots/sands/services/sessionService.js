const sessionStore = require('../../../common/services/sessionStore');
const logger = require('../../../common/utils/logger');

const HOTEL_BOT_ID = 'hotel';

class HotelSessionService {
  /**
   * Create a new session for a user
   */
  createSession(userId, initialData = {}) {
    logger.info(`Creating session for hotel user ${userId}`);
    const session = sessionStore.createSession(HOTEL_BOT_ID, userId, {
      dialogState: 'MAIN_MENU',
      attributes: initialData,
    });
    return session;
  }

  /**
   * Get user's session
   */
  getSession(userId) {
    return sessionStore.getSession(HOTEL_BOT_ID, userId);
  }

  /**
   * Update session state
   */
  setState(userId, newState) {
    const session = this.getSession(userId);
    if (session) {
      session.dialogState = newState;
      logger.debug(`Hotel session state updated for ${userId}: ${newState}`);
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
      logger.debug(`Hotel session attribute set for ${userId}: ${key}`);
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
    sessionStore.deleteSession(HOTEL_BOT_ID, userId);
    logger.info(`Hotel session cleared for ${userId}`);
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
const defaultInstance = new HotelSessionService();

module.exports = defaultInstance;
