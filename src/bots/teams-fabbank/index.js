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
      // 🔧 CRITICAL: Sanitize incoming service URL BEFORE adapter.process()
      // Teams sometimes appends tenant ID to service URL, breaking the API endpoint
      if (req.body?.serviceUrl) {
        const originalUrl = req.body.serviceUrl;
        const cleanedMatch = req.body.serviceUrl.match(/^(https:\/\/smba\.trafficmanager\.net\/[a-z]+\/)/);
        if (cleanedMatch) {
          const cleanedUrl = cleanedMatch[1];
          if (cleanedUrl !== originalUrl) {
            logger.warn(`🔧 PRE-ADAPTER: Sanitizing service URL before adapter.process()`);
            logger.warn(`   Original: ${originalUrl}`);
            logger.warn(`   Cleaned:  ${cleanedUrl}`);
            req.body.serviceUrl = cleanedUrl;
            logger.info(`✅ Service URL sanitized for adapter`);
          }
        }
      }

      // Use Bot Framework adapter to process the activity
      await this.teamsService.getAdapter().process(req, res, async context => {
        // Extract the activity and process it through the activity controller
        const activity = context.activity;

        // Store the context for synchronous message sending
        this.lastContext = context;

        await this.activityController.processActivity(activity, req, res, context);
      });
    } catch (error) {
      logger.error('Error in TeamsFabBankBot.handleWebhook', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * Get the last context for sending messages
   */
  getLastContext() {
    return this.lastContext;
  }
}

module.exports = TeamsFabBankBot;
