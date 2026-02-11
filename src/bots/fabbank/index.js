const FabBankConfig = require('./config');
const WebhookController = require('./controllers/webhookController');
const lineService = require('./services/lineService');  // Already a singleton instance
const sessionService = require('./services/sessionService');  // Already a singleton instance
const bankingService = require('./services/bankingService');  // Already a singleton instance
const logger = require('../../common/utils/logger');

class FabBankBot {
  constructor() {
    this.config = new FabBankConfig();
    this.botId = 'fabbank';

    // Services are already instantiated as singletons from environment variables
    // They are configured before this bot is initialized
    this.lineService = lineService;
    this.bankingService = bankingService;
    this.sessionService = sessionService;

    // Webhook controller (already instantiated as singleton)
    this.webhookController = WebhookController;

    logger.info(`✅ FAB Bank Bot initialized: ${this.botId}`);
  }

  async handleWebhook(req, res) {
    try {
      await this.webhookController.handleWebhook(req, res);
    } catch (error) {
      logger.error(`FAB Bank webhook error: ${error.message}`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  getConfig() {
    return this.config;
  }

  getLineService() {
    return this.lineService;
  }

  getSessionService() {
    return this.sessionService;
  }

  getBankingService() {
    return this.bankingService;
  }
}

module.exports = FabBankBot;
