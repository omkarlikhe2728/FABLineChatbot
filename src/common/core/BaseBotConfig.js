const logger = require('../utils/logger');

class BaseBotConfig {
  constructor(botId, envPrefix) {
    this.botId = botId;
    this.envPrefix = envPrefix;

    // Load LINE credentials from environment
    this.channelId = process.env[`${envPrefix}_LINE_CHANNEL_ID`];
    this.channelSecret = process.env[`${envPrefix}_LINE_CHANNEL_SECRET`];
    this.accessToken = process.env[`${envPrefix}_LINE_ACCESS_TOKEN`];

    // Validate required fields
    if (!this.channelId || !this.channelSecret || !this.accessToken) {
      throw new Error(
        `Missing LINE credentials for bot: ${botId}. ` +
        `Required env vars: ${envPrefix}_LINE_CHANNEL_ID, ${envPrefix}_LINE_CHANNEL_SECRET, ${envPrefix}_LINE_ACCESS_TOKEN`
      );
    }

    logger.info(`Configuration loaded for bot: ${botId}`, {
      channelId: this.channelId,
      hasSecret: !!this.channelSecret,
      hasToken: !!this.accessToken,
    });
  }

  validate() {
    if (!this.channelId || !this.channelSecret || !this.accessToken) {
      throw new Error(`Invalid configuration for bot: ${this.botId}`);
    }
    return true;
  }
}

module.exports = BaseBotConfig;
