const BaseBotConfig = require('../../common/core/BaseBotConfig');
const fs = require('fs');
const path = require('path');
const logger = require('../../common/utils/logger');

class FabBankConfig extends BaseBotConfig {
  constructor() {
    super('fabbank', 'FABBANK');

    // Load bot-specific settings from JSON config file
    const configPath = path.join(__dirname, '../../../config/fabbank.json');
    let jsonConfig = {};

    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        jsonConfig = JSON.parse(configContent);
        logger.debug(`LoadedPath}`);
      } catch (error) {
        logger.warn(`Failed to load config from ${configPath}:`, error.message);
      }
    } else {
      logger.info(`Config file not found at ${configPath}, using defaults`);
    }

    // Set configuration properties
    this.botName = jsonConfig.botName || 'FAB Bank Bot';
    // this.welcomeImage = jsonConfig.welcomeImage || 'https://www.bankfab.com/-/media/fab-uds/personal/promotions/2025/mclaren-f1-cards-offer/mclaren-homepage-banner-en.jpg?h=670&iar=0&w=1440&hash=AACC95307F56FA4DD937F75AF531DA93';
    this.welcomeImage = jsonConfig.welcomeImage || 'https://media.istockphoto.com/id/2174486730/vector/business-interface-security-digital-banking-and-finance-information-transaction-technology.jpg?s=1024x1024&w=is&k=20&c=HWY12R8JzHIiExyypi2haGHT4Shpye0AtmzZqFuXUsE=';
    this.features = jsonConfig.features || {
      checkBalance: true,
      cardServices: true,
      liveChat: true,
      miniStatement: true,
    };
    this.menu = jsonConfig.menu || {
      buttons: [
        { label: 'Check Balance', action: 'check_balance' },
        { label: 'Card Services', action: 'card_services' },
        { label: 'Live Chat', action: 'live_chat' },
        { label: 'End Session', action: 'end_session' },
      ],
    };
    this.sessionTimeout = jsonConfig.sessionTimeout || 300000; // 5 minutes
    this.otpExpiry = jsonConfig.otpExpiry || 300; // 5 minutes

    // API configuration from environment
    this.apiUrl = process.env.FABBANK_BANKING_API_URL;
    this.apiTimeout = parseInt(process.env.FABBANK_BANKING_API_TIMEOUT || '5000');

    // Validate configuration
    if (!this.apiUrl) {
      logger.warn('FABBANK_BANKING_API_URL not set, some features may not work');
    }

    logger.debug(`Config initialized: ${this.botId}`, {
      botName: this.botName,
      sessionTimeout: this.sessionTimeout,
      apiUrl: this.apiUrl ? 'configured' : 'not set',
    });
  }
}

module.exports = FabBankConfig;
