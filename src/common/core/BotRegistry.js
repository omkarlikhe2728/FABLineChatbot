const logger = require('../utils/logger');

class BotRegistry {
  constructor() {
    this.bots = new Map();
  }

  register(botId, botInstance) {
    if (this.bots.has(botId)) {
      throw new Error(`Bot ${botId} already registered`);
    }
    this.bots.set(botId, botInstance);
    logger.debug(`Bot registered: ${botId}`);
  }

  getBot(botId) {
    return this.bots.get(botId) || null;
  }

  getAllBots() {
    return Array.from(this.bots.values());
  }

  getBotIds() {
    return Array.from(this.bots.keys());
  }

  unregister(botId) {
    return this.bots.delete(botId);
  }

  isRegistered(botId) {
    return this.bots.has(botId);
  }
}

module.exports = new BotRegistry();
