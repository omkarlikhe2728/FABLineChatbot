const fs = require('fs');
const path = require('path');
const BaseBotConfig = require('../../common/core/BaseBotConfig');

class SandsConfig extends BaseBotConfig {
  constructor() {
    super('sands', 'SANDS');

    // Load Sands Hotel-specific JSON configuration
    const configPath = path.join(__dirname, '../../../config/sands.json');
    const jsonConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Sands Hotel-specific properties
    this.hotelName = jsonConfig.hotelName;
    this.hotelImageUrl = jsonConfig.hotelImageUrl || process.env.SANDS_IMAGE_URL;
    this.welcomeMessage = jsonConfig.welcomeMessage;
    this.features = jsonConfig.features;
    this.sessionTimeout = jsonConfig.sessionTimeout;
    this.mainMenu = jsonConfig.mainMenu;
    this.bookingAmendments = jsonConfig.bookingAmendments;
    this.foodTypes = jsonConfig.foodTypes;
    this.apiTimeout = jsonConfig.apiTimeout || 5000;
    this.maxRetries = jsonConfig.maxRetries || 3;

    // APIs
    this.bookingApiUrl = process.env.SANDS_BOOKING_API_URL;
    this.liveChatApiUrl = process.env.SANDS_LIVE_CHAT_API_URL;

    // Validate required configuration
    this._validateConfig();
  }

  _validateConfig() {
    const required = [
      'channelId',
      'channelSecret',
      'accessToken',
      'bookingApiUrl',
      'liveChatApiUrl',
    ];

    for (const field of required) {
      if (!this[field]) {
        throw new Error(
          `Sands Hotel Bot Configuration Error: Missing required field "${field}". ` +
            `Check .env.sands and config/sands.json`
        );
      }
    }
  }

  toJSON() {
    return {
      botId: this.botId,
      hotelName: this.hotelName,
      hotelImageUrl: this.hotelImageUrl,
      welcomeMessage: this.welcomeMessage,
      features: this.features,
      mainMenu: this.mainMenu,
      bookingAmendments: this.bookingAmendments,
      channelId: this.channelId,
      channelSecret: this.channelSecret,
      accessToken: this.accessToken,
      bookingApiUrl: this.bookingApiUrl,
      liveChatApiUrl: this.liveChatApiUrl,
    };
  }
}

module.exports = SandsConfig;
