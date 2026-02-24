const lineService = require("../services/lineService");
const sessionService = require("../services/sessionService");
const logger = require("../../../common/utils/logger");

class WebhookController {
	async handleWebhook(req, res) {
		try {
			const { events } = req.body;
			const body = req.body;

			logger.info(
				`FAB Bank webhook received - events: ${events?.length || 0}`,
			);

			console.log("LINE_WEBHOOK_DATA=", JSON.stringify(req.body));

			const promises = body.events.map((event) => {
				if (event.deliveryContext?.isRedelivery) return;
				return this.processEvent(event);
			});
			await Promise.all(promises);

			res.json({ message: "ok" });

			// Process all events
			// await Promise.all(
			// 	events.map(async (event) => {
			// 		try {
			// 			await this.processEvent(event);
			// 		} catch (error) {
			// 			logger.error(`Error processing event:`, error);
			// 			console.log(
			// 				"❌ Event processing error:",
			// 				error.message,
			// 			);
			// 		}
			// 	}),
			// );

			// console.log("✅ Webhook processing complete");
			// res.status(200).json({ message: "OK" });
		} catch (error) {
			logger.error("Webhook error:", error);
			console.log(" Webhook error:", error.message);
			res.status(500).json({ error: "Internal Server Error" });
		}
	}

	async processEvent(event) {
		const { type, replyToken, source } = event;
		const userId = source.userId;

		console.log(
			"📥 EVENT RECEIVED:",
			type.toUpperCase(),
			"from user:",
			userId,
		);
		logger.info(`Event: ${type} from user ${userId}`);

		// Create session if it doesn't exist (except for unfollow)
		if (type !== "unfollow") {
			const existingSession = await sessionService.getSession(userId);
			if (!existingSession) {
				console.log(`📝 Creating new session for user ${userId}`);
				await sessionService.createSession(userId);
			}
		}

		// Update last activity
		await sessionService.updateLastActivity(userId);

		switch (type) {
			case "follow":
				await this.handleFollow(replyToken, userId);
				break;

			case "unfollow":
				await sessionService.deleteSession(userId);
				break;

			case "message":
				// Check if in live chat mode to allow all message types
				const session = await sessionService.getSession(userId);
				const currentState = session
					? session.dialogState
					: "MAIN_MENU";

				if (currentState === "LIVE_CHAT_ACTIVE") {
					// In live chat - forward ALL message types
					const messageHandler = require("../handlers/messageHandler");
					await messageHandler.handleLiveChatMessage(
						replyToken,
						userId,
						event.message,
					);
				} else if (event.message.type === "text") {
			// ✅ NEW: Check if this is the first message from new user
			// New sessions have no lastActivity timestamp
			const isFirstMessage = session && session.dialogState === "MAIN_MENU" &&
				!session.lastActivity; // No activity yet = brand new session

			if (isFirstMessage && event.message.type === "text") {
				logger.info(`🎉 First message from user ${userId} - sending welcome greeting`);
				// Send welcome greeting (same as handleFollow) with banner image
				await this.handleFollow(replyToken, userId);
				break; // Break early since welcome includes menu
			}

					// Outside live chat - only handle text messages
					const messageHandler = require("../handlers/messageHandler");
					await messageHandler.handleTextMessage(
						replyToken,
						userId,
						event.message,
					);
				}
				break;

			case "postback":
				const postbackHandler = require("../handlers/postbackHandler");
				await postbackHandler.handlePostback(
					replyToken,
					userId,
					event.postback,
				);
				break;

			default:
				logger.debug(`Unknown event type: ${type}`);
		}
	}

	async handleFollow(replyToken, userId) {
		logger.info(`User ${userId} followed bot`);

		// Create session
		await sessionService.createSession(userId);

		// Send welcome message with image
		const bannerImage = "https://miro.medium.com/v2/resize:fit:780/1*wFlKJPaibnFEx9TYOViJZw.jpeg"
		const welcomeImageMessage = {
			type: "image",
			originalContentUrl: bannerImage,
			previewImageUrl: bannerImage,
		};

		const welcomeMessage = {
			type: "text",
			// text: "Welcome to FAB Bank! 🏦\nI'm your banking assistant. How can I help you today?",
			text: "Welcome to Beyond Bank! 🏦\nI'm your banking assistant. How can I assist you today?",
		};

		const menuMessage = {
			type: "template",
			altText: "Main Menu",
			template: {
				type: "buttons",
				text: "Please select an option",
				actions: [
					{
						type: "postback",
						label: "Check Balance",
						data: "action=check_balance",
						displayText: "Check Balance",
					},
					{
						type: "postback",
						label: "Card Services",
						data: "action=card_services",
						displayText: "Card Services",
					},
					{
						type: "postback",
						label: "Live Chat",
						data: "action=live_chat",
						displayText: "Live Chat",
					},
					{
						type: "postback",
						label: "End Session",
						data: "action=end_session",
						displayText: "End Session",
					},
				],
			},
		};

		await lineService.replyMessage(replyToken, [
			welcomeImageMessage,
			welcomeMessage,
			menuMessage,
		]);
	}
}

module.exports = new WebhookController();
