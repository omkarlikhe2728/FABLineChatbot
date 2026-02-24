# Project Setup & Initial Configuration

This guide covers the initial setup required for the FABLineChatbot project before deploying any individual bots.

---

## 🎯 Prerequisites

- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **Git**: For version control
- **Terminal/Command Prompt**: For running commands

---

## 📥 Installation Steps

### Step 1: Clone the Repository

```bash
# Clone the project
git clone https://github.com/omkarlikhe2728/FABLineChatbot.git

# Navigate to project directory
cd FABLineChatbot
```

### Step 2: Check Node.js & npm Versions

Verify you have the required versions installed:

```bash
# Check Node.js version (should be v14 or higher)
node --version

# Check npm version (should be v6 or higher)
npm --version
```

**Expected Output:**
```
v18.17.0 (or higher)
8.19.2 (or higher)
```

If versions are too old, download from [nodejs.org](https://nodejs.org/)

### Step 3: Install Dependencies

Install all required Node.js packages:

```bash
# Install dependencies
npm install
```

This creates:
- `node_modules/` folder with all packages
- `package-lock.json` file (locks package versions)

**Expected Time**: 2-5 minutes depending on internet speed

**Expected Output:**
```
added 500+ packages
npm notice
```

### Step 4: Create Project Configuration Files

The project uses configuration files for each bot. These should already exist but verify:

```bash
# Check if config directory exists
ls -la config/

# Should show:
# ├── bots.json
# ├── fabbank.json
# ├── sands.json
# ├── ana.json
# ├── telegram-fabbank.json
# ├── teams-fabbank.json
# └── teams-itsupport.json
```

If any are missing, create empty ones or ask the team.

### Step 5: Create Environment Variables File

Environment variables store sensitive credentials. Create separate `.env` files:

**Main environment file** (`.env`):
```bash
# Create the file
touch .env

# Or on Windows:
# type nul > .env
```

Add to `.env`:
```env
# =====================================
# COMMON SERVER CONFIGURATION
# =====================================
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
DEFAULT_API_TIMEOUT=5000
DEFAULT_SESSION_TIMEOUT=300000
```

**Bot-specific environment files** (create based on which bots you're deploying):
- `.env.fabbank` - For LINE FAB Bank bot
- `.env.sands` - For LINE Sands Hotel bot
- `.env.ana` - For LINE ANA Airline bot
- `.env.telegram-fabbank` - For Telegram FAB Bank bot
- `.env.teams-fabbank` - For Teams FAB Bank bot
- `.env.teams-itsupport` - For Teams IT Support bot

Each bot-specific file is documented in its deployment guide.

### Step 6: Configure .gitignore

Ensure environment files are not committed to Git:

```bash
# Check current .gitignore
cat .gitignore
```

Should include:
```
.env
.env.*
.env.*.local
node_modules/
dist/
.DS_Store
```

If not present, add these lines to `.gitignore`

---

## 🔧 Project Structure

```
FABLineChatbot/
├── src/
│   ├── bots/                       # Bot implementations
│   │   ├── fabbank/               # LINE FAB Bank bot
│   │   ├── sands/                 # LINE Sands Hotel bot
│   │   ├── ana/                   # LINE ANA Airline bot
│   │   ├── telegram-fabbank/      # Telegram FAB Bank bot
│   │   └── teams-fabbank/         # Teams FAB Bank bot
│   │
│   ├── common/                     # Shared code
│   │   ├── core/                  # Core utilities
│   │   ├── middleware/            # Express middleware
│   │   ├── services/              # Shared services
│   │   └── utils/                 # Utility functions
│   │
│   └── app.js                      # Express server setup
│
├── config/                         # Configuration files
│   ├── bots.json                  # Bot registry
│   ├── fabbank.json
│   ├── sands.json
│   ├── ana.json
│   ├── telegram-fabbank.json
│   ├── teams-fabbank.json
│   └── teams-itsupport.json
│
├── docs/                          # Documentation
│   ├── botwise/                   # Bot-specific guides (you are here)
│   └── README.md
│
├── .env                           # Common configuration (NEVER COMMIT)
├── .env.*                         # Bot configs (NEVER COMMIT)
├── .gitignore                     # Git ignore rules
├── package.json                   # Project dependencies
├── package-lock.json              # Dependency lock file
└── README.md                      # Main project README
```

---

## 🧪 Verify Installation

### Test 1: Check npm scripts

List all available scripts:

```bash
npm run
```

Should show:
```
Available via `npm run-script`:
  dev       # Development server with auto-reload
  start     # Production server
  test      # Run tests (if available)
```

### Test 2: Start Development Server

```bash
npm run dev
```

Should output:
```
✓ Server running on port 3001
✓ Bots initialized
✓ Listening for incoming requests
```

Press `Ctrl+C` to stop the server

### Test 3: Check Server Health

While server is running:

```bash
# In another terminal
curl http://localhost:3001/health
```

Should return:
```json
{"status":"ok"}
```

---

## 🔌 Port Configuration

The server runs on **port 3001** by default.

### Change Port

Edit `.env`:
```env
PORT=3002
```

Then restart server: `npm run dev`

### Check if Port is Already in Use

```bash
# On macOS/Linux:
lsof -i :3001

# On Windows:
netstat -ano | findstr :3001
```

If already in use, either:
1. Kill existing process
2. Or change PORT in `.env`

---

## 🌐 Set Up Ngrok (for Local Testing)

Ngrok creates a public tunnel to your local server. Useful for webhook testing.

### Install Ngrok

**Option 1: Download from website**
- Go to [ngrok.com](https://ngrok.com)
- Download and extract
- Add to PATH

**Option 2: Install via npm (global)**
```bash
npm install -g ngrok
```

### Start Ngrok Tunnel

```bash
# Create tunnel to your local server (port 3001)
ngrok http 3001
```

Output:
```
ngrok by @inconshreveable

Session Status                online
Version                       3.0.0
Web Interface                 http://127.0.0.1:4040
...
Forwarding                    https://abc123def456.ngrok-free.dev -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123def456.ngrok-free.dev`)
- This is your **public webhook URL**
- Use this in bot platform configurations
- URL changes each time you restart ngrok (free tier)

### Keep Ngrok Running

Leave ngrok running in a separate terminal while testing webhooks

---

## 📚 Database Setup (Session Storage)

By default, the bot uses **in-memory session storage** (sessions lost on server restart).

### For Production: Set Up Redis

Option: Replace in-memory storage with Redis for persistent sessions

1. **Install Redis**:
   ```bash
   # macOS
   brew install redis

   # Linux
   apt-get install redis-server

   # Windows - Download from redis.windows.net
   ```

2. **Start Redis**:
   ```bash
   redis-server
   ```

3. **Configure in project** (future task - currently uses in-memory)

---

## 🔍 Verify All Bots Are Registered

Check `config/bots.json` to see which bots are active:

```bash
cat config/bots.json
```

Should list all available bots with their configuration:
```json
{
  "bots": [
    {
      "id": "fabbank",
      "enabled": true,
      "envFile": ".env.fabbank",
      "configFile": "config/fabbank.json",
      "modulePath": "./bots/fabbank"
    },
    ...
  ]
}
```

---

## 📝 Environment Variables Summary

### Common (.env)
```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
DEFAULT_API_TIMEOUT=5000
DEFAULT_SESSION_TIMEOUT=300000
```

### Bot-Specific (.env.*)
Each bot needs its platform credentials. See individual bot deployment guides:
- [LINE FAB Bank Bot](./01-LINE-FABBANK-DEPLOYMENT.md)
- [LINE Sands Hotel Bot](./02-LINE-SANDS-DEPLOYMENT.md)
- [LINE ANA Airline Bot](./03-LINE-ANA-DEPLOYMENT.md)
- [Telegram FAB Bank Bot](./04-TELEGRAM-FABBANK-DEPLOYMENT.md)
- [Teams FAB Bank Bot](./05-TEAMS-FABBANK-DEPLOYMENT.md)
- [Teams IT Support Bot](./06-TEAMS-ITSUPPORT-DEPLOYMENT.md)

---

## ✅ Setup Checklist

Before deploying any bot:

- [ ] Node.js v14+ installed
- [ ] npm v6+ installed
- [ ] Dependencies installed: `npm install`
- [ ] `.env` file created with common config
- [ ] `.gitignore` configured (no .env in git)
- [ ] Server starts: `npm run dev`
- [ ] Health check works: `curl http://localhost:3001/health`
- [ ] Ngrok installed and working (if testing locally)
- [ ] All config files present in `config/`

---

## 🚀 Next Steps

1. **Choose a bot** to deploy from the botwise folder
2. **Follow the bot's deployment guide** for platform-specific setup
3. **Create bot-specific `.env` file** with required credentials
4. **Run the server**: `npm run dev`
5. **Test the bot** using the platform's app

---

## 🆘 Common Issues

### Issue: "npm: command not found"
**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)

### Issue: "Cannot find module" errors
**Solution**: Run `npm install` again to ensure all dependencies are installed

### Issue: "Port 3001 is already in use"
**Solution**: Either kill existing process or change PORT in `.env`

### Issue: Server starts but bots don't initialize
**Solution**: Check `.env` files exist for all bots in `config/bots.json`

---

## 📞 Need Help?

- Read the bot-specific deployment guides in this folder
- Check [TESTING.md](./TESTING.md) for testing procedures
- Review project README.md for overview

---

**Last Updated**: 2026-02-20
**Setup Version**: 1.0
