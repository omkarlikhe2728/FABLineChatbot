const HotelConfig = require('./config');
const WebhookController = require('./controllers/webhookController');
const lineService = require('./services/lineService');  // Already a singleton instance
const sessionService = require('./services/sessionService');  // Already a singleton instance
const bookingService = require('./services/bookingService');  // Already a singleton instance
const logger = require('../../common/utils/logger');

class HotelBot {
  constructor() {
    this.config = new HotelConfig();
    this.botId = 'hotel';

    // Services are already instantiated as singletons from environment variables
    // They are configured before this bot is initialized
    this.lineService = lineService;
    this.bookingService = bookingService;
    this.sessionService = sessionService;

    // Webhook controller (already instantiated as singleton)
    this.webhookController = WebhookController;

    logger.debug(`Bot initialized: ${this.botId}`);
  }

  async handleWebhook(req, res) {
    try {
      await this.webhookController.handleWebhook(req, res);
    } catch (error) {
      logger.error(`Hotel webhook error: ${error.message}`, error);
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

  getBookingService() {
    return this.bookingService;
  }
}

module.exports = HotelBot;
