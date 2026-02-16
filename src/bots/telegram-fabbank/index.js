const TelegramFabBankConfig = require('./config');
const TelegramService = require('./services/telegramService');
const SessionService = require('./services/sessionService');
const UpdateController = require('./controllers/updateController');
const logger = require('../../common/utils/logger');

class TelegramFabBankBot {
  constructor() {
    this.botId = 'telegram-fabbank';
    this.config = new TelegramFabBankConfig();

    // Initialize services
    this.telegramService = new TelegramService(this.config);
    this.sessionService = new SessionService();
    this.updateController = new UpdateController(
      this.telegramService,
      this.sessionService,
      this.config,
      this.botId
    );

    logger.info(`✅ Telegram FAB Bank Bot initialized: ${this.botId}`);
  }

  async handleWebhook(req, res) {
    try {
      const update = req.body;

      if (!update) {
        return res.status(400).json({ error: 'Invalid update' });
      }

      // Process update
      await this.updateController.processUpdate(update);

      // Send response
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error('Telegram webhook error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  getConfig() {
    return this.config;
  }

  getBotId() {
    return this.botId;
  }
}

module.exports = TelegramFabBankBot;
