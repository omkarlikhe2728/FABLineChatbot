const logger = require('../../common/utils/logger');

class TeamsFabBankConfig {
  constructor() {
    this.botId = 'teams-fabbank';
    this.envPrefix = 'TEAMS_FABBANK';
    this.platform = 'teams';

    // Teams Bot Framework Credentials
    this.appId = process.env.TEAMS_FABBANK_APP_ID;
    this.appPassword = process.env.TEAMS_FABBANK_APP_PASSWORD;
    this.microsoftAppTenantId = process.env.TEAMS_FABBANK_MICROSOFT_APP_TENANT_ID;

    // Banking API
    this.bankingApiUrl = process.env.TEAMS_FABBANK_BANKING_API_URL ||
      'https://password-reset.lab.bravishma.com:6507/api/v1';
    this.bankingApiTimeout = parseInt(process.env.TEAMS_FABBANK_BANKING_API_TIMEOUT || '5000');

    // Live Chat Middleware
    this.liveChatApiUrl = process.env.TEAMS_FABBANK_LIVE_CHAT_API_URL ||
      'https://infobip-connector.lab.bravishma.com/';
    this.liveChatTimeout = parseInt(process.env.TEAMS_FABBANK_LIVE_CHAT_TIMEOUT || '20000');

    // Session Management
    this.sessionTimeout = parseInt(process.env.TEAMS_FABBANK_SESSION_TIMEOUT || '300000'); // 5 minutes
    this.tenantId = process.env.TEAMS_FABBANK_TENANT_ID || 'teams-fabbank';
    this.botName = process.env.TEAMS_FABBANK_BOT_NAME || 'FAB Bank Teams Bot';

    // Validation
    if (!this.appId || !this.appPassword) {
      throw new Error('Teams bot requires TEAMS_FABBANK_APP_ID and TEAMS_FABBANK_APP_PASSWORD');
    }

    logger.info(`TeamsFabBankConfig loaded for bot: ${this.botId}`, {
      appId: this.appId?.substring(0, 10) + '...',
      bankingApi: this.bankingApiUrl,
      liveChatApi: this.liveChatApiUrl,
      tenantId: this.tenantId,
    });
  }

  validate() {
    if (!this.appId || !this.appPassword) {
      throw new Error(`Invalid Teams bot configuration for: ${this.botId}`);
    }
    return true;
  }

  getConfig() {
    return {
      botId: this.botId,
      appId: this.appId,
      appPassword: this.appPassword,
      bankingApiUrl: this.bankingApiUrl,
      liveChatApiUrl: this.liveChatApiUrl,
      tenantId: this.tenantId,
    };
  }
}

module.exports = TeamsFabBankConfig;
