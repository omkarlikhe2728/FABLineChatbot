const TeamsItSupportConfig = require('./config');
const ActivityController = require('./controllers/activityController');
const TeamsService = require('./services/teamsService');
const SessionService = require('./services/sessionService');
const DialogManager = require('./services/dialogManager');
const ItSupportService = require('./services/itSupportService');
const TemplateService = require('./services/templateService');
const LiveChatService = require('./services/liveChatService');
const logger = require('../../common/utils/logger');

class TeamsItSupportBot {
  constructor() {
    try {
      this.config = new TeamsItSupportConfig();

      // Initialize services in dependency order
      this.teamsService = new TeamsService(this.config);
      this.sessionService = new SessionService(this.config);
      this.templateService = new TemplateService(this.config);
      this.itSupportService = new ItSupportService(this.config);
      this.liveChatService = new LiveChatService(this.config);

      this.dialogManager = new DialogManager(
        this.sessionService,
        this.itSupportService,
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

      logger.debug(`Bot initialized successfully with config: ${this.config.botName}`);
    } catch (error) {
      logger.error('Failed to initialize TeamsItSupportBot', error);
      throw error;
    }
  }

  async handleWebhook(req, res) {
    try {
      // Use Bot Framework adapter to process the activity
      // IMPORTANT: Do NOT modify req.body.serviceUrl - it's part of the JWT signature
      // The adapter will validate the JWT using the original service URL
      await this.teamsService.getAdapter().process(req, res, async context => {
        // Extract the activity and process it through the activity controller
        const activity = context.activity;

        // Store the context for synchronous message sending
        this.lastContext = context;

        //  Service URL sanitization happens in activityController.processActivity()
        // This is correct because:
        // 1. JWT validation already passed (using original service URL)
        // 2. We sanitize context for outbound API calls
        // 3. Adapter can now use clean service URL for token generation and API calls

        await this.activityController.processActivity(activity, req, res, context);
      });
    } catch (error) {
      logger.error('Error in TeamsItSupportBot.handleWebhook', error);
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

module.exports = TeamsItSupportBot;
