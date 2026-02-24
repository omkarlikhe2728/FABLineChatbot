# 📚 FABLineChatbot Documentation

Comprehensive documentation for the Multi-Bot Platform supporting LINE, Teams, and Telegram messaging platforms.

---

## 🚀 **Quick Start - Bot-Wise Deployment Guides**

**👉 [Go to `botwise/` folder](./botwise/README.md) for all bot deployment, setup, testing, and troubleshooting guides.**

The `botwise/` folder contains everything you need:

### 📖 **Core Documentation**
- **[botwise/README.md](./botwise/README.md)** - Overview of all 6 bots and navigation guide
- **[botwise/SETUP.md](./botwise/SETUP.md)** - Initial project setup & dependencies
- **[botwise/TESTING.md](./botwise/TESTING.md)** - Complete testing procedures for all bots
- **[botwise/TROUBLESHOOTING.md](./botwise/TROUBLESHOOTING.md)** - Common issues & solutions

### 🤖 **Bot-Specific Deployment Guides**

#### LINE Bots
- **[botwise/01-LINE-FABBANK-DEPLOYMENT.md](./botwise/01-LINE-FABBANK-DEPLOYMENT.md)** - FAB Bank LINE bot
- **[botwise/02-LINE-SANDS-DEPLOYMENT.md](./botwise/02-LINE-SANDS-DEPLOYMENT.md)** - Sands Hotel LINE bot
- **[botwise/03-LINE-ANA-DEPLOYMENT.md](./botwise/03-LINE-ANA-DEPLOYMENT.md)** - ANA Airline LINE bot

#### Telegram Bot
- **[botwise/04-TELEGRAM-FABBANK-DEPLOYMENT.md](./botwise/04-TELEGRAM-FABBANK-DEPLOYMENT.md)** - FAB Bank Telegram bot

#### Microsoft Teams Bots
- **[botwise/05-TEAMS-FABBANK-DEPLOYMENT.md](./botwise/05-TEAMS-FABBANK-DEPLOYMENT.md)** - FAB Bank Teams bot
- **[botwise/06-TEAMS-ITSUPPORT-DEPLOYMENT.md](./botwise/06-TEAMS-ITSUPPORT-DEPLOYMENT.md)** - IT Support Teams bot

---

## 📋 **How to Get Started**

### For First-Time Deployment:
1. Start with **[botwise/SETUP.md](./botwise/SETUP.md)** - Setup project & dependencies
2. Choose your bot from the list above
3. Follow that bot's specific deployment guide
4. Use **[botwise/TESTING.md](./botwise/TESTING.md)** to verify everything works

### For Troubleshooting:
- Check **[botwise/TROUBLESHOOTING.md](./botwise/TROUBLESHOOTING.md)** for common issues
- Or see the troubleshooting section in your bot's deployment guide

---

## 📊 **Project Structure**

```
FABLineChatbot/
├── docs/                          # All documentation files
│   ├── README.md                  # This file (main index)
│   └── botwise/                   # Bot deployment guides (START HERE!)
│       ├── README.md              # Bot overview & navigation
│       ├── SETUP.md               # Project setup guide
│       ├── TESTING.md             # Testing procedures
│       ├── TROUBLESHOOTING.md     # Common issues & solutions
│       └── 01-06-*.md             # Bot-specific guides
├── src/
│   ├── bots/                      # Bot implementations
│   │   ├── fabbank/               # LINE FAB Bank bot
│   │   ├── sands/                 # LINE Sands Hotel bot
│   │   ├── ana/                   # LINE ANA Airline bot
│   │   ├── telegram-fabbank/      # Telegram FAB Bank bot
│   │   ├── teams-fabbank/         # Teams FAB Bank bot
│   │   └── teams-itsupport/       # Teams IT Support bot
│   ├── common/                    # Shared services & utilities
│   ├── app.js                     # Express app configuration
│   └── server.js                  # Main server entry
├── config/                        # Bot configurations
├── .env*                          # Environment files (never commit)
├── package.json                   # Dependencies
└── README.md                       # Root README
```

---

## 🔑 **Key Features**

✅ **Multi-Platform Support**
- LINE Messaging API (3 bots)
- Microsoft Teams Bot Framework (2 bots)
- Telegram Bot API (1 bot)

✅ **Shared Features Across All Bots**
- Session management (in-memory with 5-min timeout)
- Dialog state machine (15+ states per bot)
- Live chat integration with Avaya
- Rich media support (images, videos, files)
- OTP-based authentication (banking bots)
- Banking/Service API integration

✅ **Production Ready**
- Error handling and logging
- Health check endpoints
- Webhook validation
- Configuration management
- Security best practices

---

## 🎯 **Current Status**

✅ **Completed**
- All 6 bots fully implemented and tested
- Multi-platform support (LINE, Teams, Telegram)
- Live chat integration
- Dialog state machines
- Rich media support
- Comprehensive deployment guides (NEW!)

✅ **Documentation**
- Complete bot-wise deployment guides
- Testing procedures for all bots
- Troubleshooting guides
- Security best practices

📋 **Next Steps**
- Migrate to Redis for production session management
- Analytics dashboard
- Advanced reporting
- Webhook authentication improvements

---

## 📞 **Support**

For help with:
- **Setup** → See [botwise/SETUP.md](./botwise/SETUP.md)
- **Specific Bot** → See that bot's deployment guide in botwise/
- **Testing** → See [botwise/TESTING.md](./botwise/TESTING.md)
- **Troubleshooting** → See [botwise/TROUBLESHOOTING.md](./botwise/TROUBLESHOOTING.md)

---

**Last Updated:** February 2026
**Version:** 3.0.0 (Documentation Reorganized)
**Status:** ✅ All 6 Bots + Complete Deployment Guides Ready
