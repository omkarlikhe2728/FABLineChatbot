const line = require("@line/bot-sdk");
const logger = require("../../../common/utils/logger");

// Import services
const lineService = require("../services/lineService");
const sessionService = require("../services/sessionService");
const airlineService = require("../services/airlineService");
const liveChatService = require("../services/liveChatService");
const templateService = require("../services/templateService");
const dialogManager = require("../services/dialogManager");

class WebhookController {
	constructor() {
		this.initialized = false;
	}

	/**
	 * Initialize dialog manager with all dependencies
	 */
	_initializeDialogManager() {
		if (!this.initialized) {
			dialogManager.sessionService = sessionService;
			dialogManager.lineService = lineService;
			dialogManager.airlineService = airlineService;
			dialogManager.liveChatService = liveChatService;
			dialogManager.templateService = templateService;
			this.initialized = true;
			logger.info(" ANA DialogManager dependencies injected");
		}
	}

	/**
	 * Main webhook handler
	 */
	async handleWebhook(req, res) {
		try {
			this._initializeDialogManager();

			const body = req.body;
			console.log("LINE_WEBHOOK_DATA=", JSON.stringify(body));

			logger.info(
				`ANA webhook received - events: ${body.events?.length || 0}`,
			);


			// Process each event
			const promises = body.events.map((event) => {
				if (event.deliveryContext?.isRedelivery) return;
				return this._processEvent(event);
			});
			await Promise.all(promises);

			res.json({ message: "ok" });
		} catch (error) {
			logger.error(`ANA webhook error: ${error.message}`, error);
			res.status(500).json({ error: "Internal Server Error" });
		}
	}

	/**
	 * Process a single LINE event
	 */
	async _processEvent(event) {
		try {
			logger.info(
				`Processing event: ${event.type}, replyToken: ${event.replyToken}`,
			);

			// Skip events without valid reply token
			if (!this._isValidReplyToken(event.replyToken)) {
				logger.info(`Skipping event with invalid reply token`);
				return null;
			}

			const userId = event.source.userId;

			// Auto-create session for all events except unfollow
			if (event.type !== "unfollow") {
				sessionService.ensureSession(userId);
			}

			// Route by event type
			switch (event.type) {
				case "follow":
					return await this._handleFollowEvent(event, userId);
				case "message":
					return await this._handleMessageEvent(event, userId);
				case "postback":
					return await this._handlePostbackEvent(event, userId);
				case "unfollow":
					return this._handleUnfollowEvent(userId);
				default:
					logger.warn(`Unhandled event type: ${event.type}`);
					return null;
			}
		} catch (error) {
			logger.error(`Error processing event: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Handle follow event (user adds bot as friend)
	 */
	async _handleFollowEvent(event, userId) {
		logger.info(`User ${userId} followed the ANA bot`);

		const messages = await dialogManager.processMessage(
			userId,
			"follow",
			{},
		);

		if (messages) {
			return this._replyMessages(event.replyToken, messages);
		}
		return null;
	}

	/**
	 * Handle message event (text or other message types)
	 */
	async _handleMessageEvent(event, userId) {
		const session = sessionService.getSession(userId);
		const currentState = session ? session.dialogState : "MAIN_MENU";

		// In live chat mode - forward ALL message types as-is
		if (currentState === "LIVE_CHAT_ACTIVE") {
			logger.info(
				`Live chat ${event.message.type} message from ${userId}`,
			);

			// Pass entire message object to dialogManager
			const messages = await dialogManager.processMessage(
				userId,
				"livechat_message",
				event.message,
			);

			if (messages) {
				return this._replyMessages(event.replyToken, messages);
			}
			return null;
		}

		// Outside live chat, only handle text messages
		if (event.message.type !== "text") {
			logger.info(
				`Skipping non-text message type: ${event.message.type}`,
			);
			return null;
		}

		const messageText = event.message.text;
		logger.info(`Text message from ${userId}: "${messageText}"`);

		const messages = await dialogManager.processMessage(
			userId,
			"text",
			messageText,
		);

		if (messages) {
			return this._replyMessages(event.replyToken, messages);
		}

		// For live chat messages, don't reply (agent will reply via middleware)
		return null;
	}

	/**
	 * Handle postback event (button clicks)
	 */
	async _handlePostbackEvent(event, userId) {
		const postbackData = new URLSearchParams(event.postback.data);
		const action = postbackData.get("action");
		logger.info(`Postback action: ${action}, user: ${userId}`);

		const messages = await dialogManager.processMessage(
			userId,
			"postback",
			{
				action: action,
				data: Object.fromEntries(postbackData),
			},
		);

		if (messages) {
			return this._replyMessages(event.replyToken, messages);
		}
		return null;
	}

	/**
	 * Handle unfollow event (user removes bot from friends)
	 */
	_handleUnfollowEvent(userId) {
		logger.info(`User ${userId} unfollowed the ANA bot`);
		sessionService.clearSession(userId);
		return null;
	}

	/**
	 * Reply with messages
	 */
	async _replyMessages(replyToken, messages) {
		try {
			logger.info(`Sending ${messages.length} messages`);
			await lineService.reply(replyToken, messages);
			return null;
		} catch (error) {
			logger.error(`Failed to send reply: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Check if reply token is valid
	 */
	_isValidReplyToken(token) {
		if (!token) return false;
		if (/^0+$/.test(token)) return false;
		if (token === "ffffffffffffffffffffffffffffffff") return false;
		return true;
	}
}

// Create and export singleton instance
const defaultInstance = new WebhookController();

module.exports = defaultInstance;
