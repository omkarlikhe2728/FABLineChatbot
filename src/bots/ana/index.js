const AnaConfig = require('./config');
const WebhookController = require('./controllers/webhookController');
const lineService = require('./services/lineService');
const sessionService = require('./services/sessionService');
const airlineService = require('./services/airlineService');
const logger = require('../../common/utils/logger');

class AnaBot {
  constructor() {
    this.config = new AnaConfig();
    this.botId = 'ana';

    // Services are already instantiated as singletons from environment variables
    this.lineService = lineService;
    this.airlineService = airlineService;
    this.sessionService = sessionService;

    // Webhook controller (already instantiated as singleton)
    this.webhookController = WebhookController;

    logger.debug(`Bot initialized: ${this.botId}`);
  }

  async handleWebhook(req, res) {
    try {
      await this.webhookController.handleWebhook(req, res);
    } catch (error) {
      logger.error(`ANA webhook error: ${error.message}`, error);
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

  getAirlineService() {
    return this.airlineService;
  }
}

module.exports = AnaBot;
