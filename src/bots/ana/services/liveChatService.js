const axios = require("axios");
const logger = require("../../../common/utils/logger");

const lineService = require("../services/lineService");

class LiveChatService {
	constructor(config = {}) {
		this.baseUrl = config.baseUrl || process.env.ANA_LIVE_CHAT_API_URL;
		this.timeout = config.timeout || 20000;
		this.botId = config.botId || "ana";
		this.tenantId = config.tenantId || "";

		this.lineService = lineService;

		if (!this.baseUrl) {
			logger.warn(
				"ANA LiveChatService initialized without API URL (live chat will be disabled)",
			);
		} else {
			logger.info(
				`✅ ANA LiveChatService initialized with baseUrl: ${this.baseUrl}, botId: ${this.botId}, tenantId: ${this.tenantId}`,
			);
		}
	}

	/**
	 * Initiate live chat session via middleware
	 */
	async startLiveChat(userId, displayName, initialMessage = "") {
		try {
			if (!this.baseUrl) {
				logger.warn(`Live chat not configured for user ${userId}`);
				return {
					success: false,
					error: "Live chat service not configured",
				};
			}

			logger.info(
				`Starting live chat for user ${userId}: ${displayName}`,
			);

			let initMsg = {
				type: "text",
				text: initialMessage || "Customer initiated live chat",
			};

			console.log(
				" connector_url=",
				`"${this.baseUrl}/api/line-direct/live-chat/message/${this.tenantId}"`,
			);
			console.log(
				"connector_payload=",
				JSON.stringify({
					userId,
					displayName,
					channel: "line",
					message: initMsg,
				}),
			);

			const response = await axios.post(
				`${this.baseUrl}/api/line-direct/live-chat/message/${this.tenantId}`,
				{
					userId,
					displayName,
					channel: "line",
					message: initMsg,
				},
				{
					timeout: this.timeout,
				},
			);

			logger.info(`Live chat started successfully for user ${userId}`);
			return {
				success: true,
				data: response.data,
			};
		} catch (error) {
			logger.error(
				`Failed to start live chat for ${userId}: ${error.message}`,
			);
			return {
				success: false,
				error: error.message,
				statusCode: error.response?.status,
			};
		}
	}

	/**
	 * Send message to live chat agent
	 * @param {string} userId - LINE user ID
	 * @param {Object|string} message - Complete LINE message object or text string
	 * @returns {Promise<Object>} - API response
	 */
	async sendMessage(userId, message) {
		try {
			if (!this.baseUrl) {
				logger.warn(`Live chat not configured for user ${userId}`);
				return {
					success: false,
					error: "Live chat service not configured",
				};
			}

			// Handle backward compatibility - if string passed, wrap it
			if (typeof message === "string") {
				message = { type: "text", text: message };
			}

			const messageType = message.type || "text";
			logger.info(
				`Sending ${messageType} live chat message for user ${userId}`,
			);

			const profile = await this.lineService.getProfile(userId);

			// Send entire LINE message object to middleware
			const payload = {
				userId,
				displayName: profile.displayName,
				channel: "line",
				message: message, // Complete LINE message object (type, id, text, contentProvider, etc.)
			};

			console.log(
				" connector_url=",
				`"${this.baseUrl}/api/line-direct/live-chat/message/${this.tenantId}"`,
			);
			console.log("connector_payload=", JSON.stringify(payload));

			const response = await axios.post(
				`${this.baseUrl}/api/line-direct/live-chat/message/${this.tenantId}`,
				payload,
				{
					timeout: this.timeout,
					headers: { "Content-Type": "application/json" },
				},
			);

			logger.info(
				`Live chat ${messageType} sent successfully for user ${userId}`,
			);
			return {
				success: true,
				data: response.data,
			};
		} catch (error) {
			logger.error(
				`Failed to send live chat message for ${userId}: ${error.message}`,
			);
			console.log("error ", error);
			return {
				success: false,
				error: error.message,
				statusCode: error.response?.status,
			};
		}
	}

	/**
	 * End live chat session
	 */
	async endLiveChat(userId) {
		try {
			if (!this.baseUrl) {
				logger.warn(`Live chat not configured for user ${userId}`);
				return {
					success: false,
					error: "Live chat service not configured",
				};
			}

			logger.info(`Ending live chat for user ${userId}`);

			const response = await axios.post(
				`${this.baseUrl}/api/line-direct/live-chat/end`,
				{ userId },
				{
					timeout: this.timeout,
				},
			);

			logger.info(`Live chat ended successfully for user ${userId}`);
			return {
				success: true,
				data: response.data,
			};
		} catch (error) {
			logger.error(
				`Failed to end live chat for ${userId}: ${error.message}`,
			);
			// Don't fail if end fails — user already disconnected
			return {
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * Check if live chat is available
	 */
	isAvailable() {
		return !!this.baseUrl;
	}
}

// Create singleton instance
const defaultConfig = {
	baseUrl: process.env.ANA_LIVE_CHAT_API_URL,
	botId: "ana",
	tenantId: "ana",
	// tenantId: "showmeavaya",
};
const defaultInstance = new LiveChatService(defaultConfig);

module.exports = defaultInstance;
