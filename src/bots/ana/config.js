const fs = require('fs');
const path = require('path');
const BaseBotConfig = require('../../common/core/BaseBotConfig');

class AnaConfig extends BaseBotConfig {
  constructor() {
    super('ana', 'ANA');

    // Load ANA Airline-specific JSON configuration
    const configPath = path.join(__dirname, '../../../config/ana.json');
    const jsonConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // ANA Airline-specific properties
    this.botName = jsonConfig.botName;
    this.airlineName = jsonConfig.airlineName;
    this.welcomeImage = jsonConfig.welcomeImage;
    this.features = jsonConfig.features;
    this.mainMenu = jsonConfig.mainMenu;
    this.sessionTimeout = jsonConfig.sessionTimeout || 900000;
    this.apiBaseUrl = jsonConfig.apiBaseUrl;
    this.apiTimeout = jsonConfig.apiTimeout || 5000;

    // APIs
    this.airlineApiUrl = process.env.ANA_AIRLINE_API_URL || jsonConfig.apiBaseUrl;
    this.liveChatApiUrl = process.env.ANA_LIVE_CHAT_API_URL;

    // Validate required configuration
    this._validateConfig();
  }

  _validateConfig() {
    const required = [
      'channelId',
      'channelSecret',
      'accessToken',
      'airlineApiUrl',
    ];

    for (const field of required) {
      if (!this[field]) {
        throw new Error(
          `ANA Airline Bot Configuration Error: Missing required field "${field}". ` +
            `Check .env.ana and config/ana.json`
        );
      }
    }
  }

  toJSON() {
    return {
      botId: this.botId,
      botName: this.botName,
      airlineName: this.airlineName,
      welcomeImage: this.welcomeImage,
      features: this.features,
      mainMenu: this.mainMenu,
      channelId: this.channelId,
      channelSecret: this.channelSecret,
      accessToken: this.accessToken,
      airlineApiUrl: this.airlineApiUrl,
      liveChatApiUrl: this.liveChatApiUrl,
    };
  }
}

module.exports = AnaConfig;
