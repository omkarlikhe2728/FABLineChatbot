# Bot-wise Deployment Guide

This folder contains detailed deployment instructions for each bot in the FABLineChatbot multi-bot architecture.

## 📋 Available Bots

### LINE Platform Bots
1. **[LINE FAB Bank Bot](./01-LINE-FABBANK-DEPLOYMENT.md)** - Banking services bot for FAB Bank
2. **[LINE Sands Hotel Bot](./02-LINE-SANDS-DEPLOYMENT.md)** - Concierge bot for Sands Hotel Macau
3. **[LINE ANA Airline Bot](./03-LINE-ANA-DEPLOYMENT.md)** - Flight services bot for ANA (All Nippon Airways)

### Telegram Platform Bot
4. **[Telegram FAB Bank Bot](./04-TELEGRAM-FABBANK-DEPLOYMENT.md)** - Banking services bot for Telegram

### Microsoft Teams Platform Bots
5. **[Teams FAB Bank Bot](./05-TEAMS-FABBANK-DEPLOYMENT.md)** - Banking services bot for Teams
6. **[Teams IT Support Bot](./06-TEAMS-ITSUPPORT-DEPLOYMENT.md)** - IT Support bot for Teams

---

## 🚀 Quick Deployment Overview

### Prerequisites (All Bots)
- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **Git**: For cloning and version control
- **Ngrok** (for local testing): Free account at https://ngrok.com

### Deployment Steps (All Bots)
1. Clone the repository
2. Install dependencies
3. Create bot-specific `.env` file with required credentials
4. Configure webhook endpoints
5. Run the server
6. Test the bot

### Environment Setup
- **Development**: `NODE_ENV=development`
- **Production**: `NODE_ENV=production`
- **Port**: 3001 (default, configurable via `.env`)

---

## 📋 Configuration Files Structure

Each bot requires:

```
FABLineChatbot/
├── .env                          # Common server configuration
├── .env.<bot-name>              # Bot-specific credentials
├── config/
│   ├── bots.json               # All bots configuration
│   └── <bot-name>.json         # Bot-specific settings
└── src/bots/<bot-name>/        # Bot source code
```

---

## 🔐 Credential Management

### Never Commit Credentials!
- `.env` and `.env.*` files should **never** be committed to git
- Use `.gitignore` to exclude these files
- Add to `.gitignore`:
  ```
  .env
  .env.*
  .env.local
  ```

### How to Get Credentials
Each bot's deployment guide includes:
- **Credential Requirements**: What API keys/tokens you need
- **Step-by-Step Instructions**: How to obtain each credential
- **Verification Steps**: How to test credentials are valid

---

## 📖 Quick Links

### Common Tasks
- **[Server Setup & Dependencies](./SETUP.md)** - Initial project setup
- **[Testing & Verification](./TESTING.md)** - How to test each bot
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

### Platform-Specific Guides
- **LINE Messaging API**: [LINE Developers Portal](https://developers.line.biz)
- **Telegram Bot API**: [Telegram Docs](https://core.telegram.org/bots/api)
- **Microsoft Teams Bot Framework**: [Teams Developer Portal](https://dev.teams.microsoft.com)

---

## 🔍 Environment Variables Reference

### Common Variables (`.env`)
```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
DEFAULT_API_TIMEOUT=5000
DEFAULT_SESSION_TIMEOUT=300000
```

### Bot-Specific Variables
See individual bot deployment guides for their specific `.env` variables.

---

## 📝 Deployment Checklist

Before deploying any bot:

- [ ] Read the bot-specific deployment guide
- [ ] Obtain all required credentials
- [ ] Create `.env.<bot-name>` file
- [ ] Verify credentials are correct
- [ ] Install dependencies: `npm install`
- [ ] Start server: `npm run dev` (development) or `npm start` (production)
- [ ] Configure webhook in platform console
- [ ] Test bot functionality
- [ ] Monitor logs for errors

---

## 🆘 Need Help?

### For Specific Bot Issues
- See the bot's deployment guide `Troubleshooting` section

### For Common Issues
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### For Setup Issues
- Check [SETUP.md](./SETUP.md)

---

## 📞 Support

For detailed deployment instructions for a specific bot, select from the list above.

Each guide includes:
- ✅ What you need to deploy
- ✅ Step-by-step credential setup
- ✅ Environment variable configuration
- ✅ Webhook setup instructions
- ✅ Testing & verification steps
- ✅ Common troubleshooting tips
