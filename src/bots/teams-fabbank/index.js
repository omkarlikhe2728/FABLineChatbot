const TeamsFabBankConfig = require('./config');
const ActivityController = require('./controllers/activityController');
const TeamsService = require('./services/teamsService');
const SessionService = require('./services/sessionService');
const DialogManager = require('./services/dialogManager');
const BankingService = require('./services/bankingService');
const TemplateService = require('./services/templateService');
const LiveChatService = require('./services/liveChatService');
const logger = require('../../common/utils/logger');

class TeamsFabBankBot {
  constructor() {
    try {
      this.config = new TeamsFabBankConfig();

      // Initialize services in dependency order
      this.teamsService = new TeamsService(this.config);
      this.sessionService = new SessionService(this.config);
      this.templateService = new TemplateService(this.config);
      this.bankingService = BankingService; // Use shared banking service instance (not a constructor)
      this.liveChatService = new LiveChatService(this.config);

      this.dialogManager = new DialogManager(
        this.sessionService,
        this.bankingService,
        this.templateService,
        this.liveChatService,
        this.config
      );

      this.activityController = new ActivityController(
        this.teamsService,
        this.sessionService,
        this.dialogManager,
        this.templateService
      );

      logger.info(`TeamsFabBankBot initialized successfully with config: ${this.config.botName}`);
    } catch (error) {
      logger.error('Failed to initialize TeamsFabBankBot', error);
      throw error;
    }
  }

  async handleWebhook(req, res) {
    try {
      const activity = req.body;
      await this.activityController.processActivity(activity, req, res);
    } catch (error) {
      logger.error('Error in TeamsFabBankBot.handleWebhook', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TeamsFabBankBot;
