const logger = require('../../common/utils/logger');
const fs = require('fs');
const path = require('path');

class TeamsItSupportConfig {
  constructor() {
    this.botId = 'teams-itsupport';
    this.envPrefix = 'TEAMS_ITSUPPORT';
    this.platform = 'teams';

    // Teams Bot Framework Credentials
    this.appId = process.env.TEAMS_ITSUPPORT_APP_ID;
    this.appPassword = process.env.TEAMS_ITSUPPORT_APP_PASSWORD;
    this.microsoftAppTenantId = process.env.TEAMS_ITSUPPORT_MICROSOFT_APP_TENANT_ID;

    // IT Support Backend API
    this.apiUrl = process.env.TEAMS_ITSUPPORT_API_URL || 'http://localhost:3000';
    this.apiTimeout = parseInt(process.env.TEAMS_ITSUPPORT_API_TIMEOUT || '10000');

    // Live Chat Middleware
    this.liveChatApiUrl = process.env.TEAMS_ITSUPPORT_LIVE_CHAT_API_URL ||
      'https://infobip-connector.lab.bravishma.com/';
    this.liveChatTimeout = parseInt(process.env.TEAMS_ITSUPPORT_LIVE_CHAT_TIMEOUT || '20000');

    // Session Management
    this.sessionTimeout = parseInt(process.env.TEAMS_ITSUPPORT_SESSION_TIMEOUT || '300000'); // 5 minutes
    this.tenantId = process.env.TEAMS_ITSUPPORT_TENANT_ID || 'teams-itsupport';
    this.botName = process.env.TEAMS_ITSUPPORT_BOT_NAME || 'IT Support Bot';

    // Welcome Message
    this.welcomeImage = process.env.TEAMS_ITSUPPORT_WELCOME_IMAGE || null;

    // Load troubleshooting steps from config JSON file
    try {
      const configPath = path.join(__dirname, '../../..', 'config', 'teams-itsupport.json');
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      this.troubleshootingSteps = configData.troubleshootingSteps || {};
    } catch (error) {
      logger.warn('Failed to load troubleshootingSteps from config file', error.message);
      this.troubleshootingSteps = {};
    }

    // Validation
    if (!this.appId || !this.appPassword) {
      throw new Error('Teams IT Support bot requires TEAMS_ITSUPPORT_APP_ID and TEAMS_ITSUPPORT_APP_PASSWORD');
    }

    logger.info(`TeamsItSupportConfig loaded for bot: ${this.botId}`, {
      appId: this.appId?.substring(0, 10) + '...',
      api: this.apiUrl,
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
      apiUrl: this.apiUrl,
      liveChatApiUrl: this.liveChatApiUrl,
      tenantId: this.tenantId,
    };
  }
}

module.exports = TeamsItSupportConfig;
