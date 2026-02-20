# Environment Configuration Structure

This project uses a multi-bot architecture with separated environment configurations.

## File Organization

### `.env` (Common Server Configuration)
**Purpose**: Shared settings for the entire application server

Contains:
- `PORT` - Server listening port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (info/debug/warn/error)
- `DEFAULT_API_TIMEOUT` - Default API call timeout in ms (5000)
- `DEFAULT_SESSION_TIMEOUT` - Default session timeout in ms (300000)

**Rules**:
- ✅ Only server-wide settings
- ❌ NO bot-specific credentials
- ❌ NO bot-specific APIs or URLs

### Bot-Specific Configuration Files

#### `.env.fabbank` (FAB Bank - LINE Platform)
**Bot ID**: `fabbank` or `line-fabbank`

Contains:
- LINE credentials (CHANNEL_ID, CHANNEL_SECRET, ACCESS_TOKEN)
- Banking API URL and timeout
- Live Chat middleware URL
- Session configuration

#### `.env.sands` (Sands Hotel - LINE Platform)
**Bot ID**: `sands` or `line-sands`

Contains:
- LINE credentials
- Booking API URL
- Live Chat middleware URL
- Hotel name and image URL

#### `.env.ana` (ANA Airline - LINE Platform)
**Bot ID**: `ana` or `line-ana`

Contains:
- LINE credentials
- Airline API URL and timeout
- Live Chat middleware URL
- Session timeout (longer: 900000 ms)

#### `.env.telegram-fabbank` (FAB Bank - Telegram Platform)
**Bot ID**: `telegram-fabbank`

Contains:
- Telegram bot token (from @BotFather)
- Banking API URL (shared with FAB Bank LINE bot)
- Live Chat middleware URL
- Bot settings (name, session timeout, OTP expiry)
- Optional welcome image URL

## Naming Convention

All bot-specific environment variables follow the pattern:
```
{BOT_PREFIX}_{SETTING_NAME}
```

### Examples:
```
FABBANK_LINE_CHANNEL_ID        # FAB Bank LINE credentials
SANDS_BOOKING_API_URL           # Sands Hotel APIs
ANA_AIRLINE_API_TIMEOUT         # ANA timeout setting
TELEGRAM_FABBANK_BOT_TOKEN      # Telegram credentials
```

## How Bots Load Configuration

Each bot loads its specific `.env.{botId}` file:

```javascript
// In BotInitializer.initializeBot()
const envFile = config.envFile;  // e.g., ".env.fabbank"
require('dotenv').config({ path: envFile });
```

Then reads environment variables with its prefix:
```javascript
// FAB Bank bot reads FABBANK_* variables
const accessToken = process.env.FABBANK_LINE_ACCESS_TOKEN;

// Sands bot reads SANDS_* variables
const hotelName = process.env.SANDS_NAME;

// Telegram bot reads TELEGRAM_FABBANK_* variables
const botToken = process.env.TELEGRAM_FABBANK_BOT_TOKEN;
```

## Adding a New Bot

To add a new bot, create a new `.env.{botId}` file:

```env
# =====================================
# MY NEW BOT - PLATFORM NAME
# =====================================

# Credentials
MYNEWBOT_LINE_CHANNEL_ID=...
MYNEWBOT_LINE_CHANNEL_SECRET=...
MYNEWBOT_LINE_ACCESS_TOKEN=...

# APIs
MYNEWBOT_API_URL=...
MYNEWBOT_API_TIMEOUT=5000

# Bot Settings
MYNEWBOT_NAME=...
MYNEWBOT_SESSION_TIMEOUT=300000
```

Then register it in `config/bots.json`:
```json
{
  "id": "mynewbot",
  "enabled": true,
  "platform": "line",
  "envFile": ".env.mynewbot",
  "configFile": "config/mynewbot.json",
  "modulePath": "./bots/mynewbot"
}
```

## Security Notes

**Important**: Never commit `.env` files to git (already in `.gitignore`)

- Keep all credentials in environment files only
- Never hardcode API keys or tokens
- Rotate credentials periodically
- Use different credentials for different environments (dev/staging/production)

## Supported Platforms

| Platform | Bot Prefix | Example File |
|----------|-----------|--------------|
| LINE | `{BOTNAME}` | `.env.fabbank` |
| Telegram | `TELEGRAM_{BOTNAME}` | `.env.telegram-fabbank` |
| Future: WhatsApp | `WHATSAPP_{BOTNAME}` | `.env.whatsapp-fabbank` |

## API Timeout Defaults

| Setting | Default | Used By |
|---------|---------|---------|
| `API_TIMEOUT` | 5000 ms | FAB Bank, Sands, Telegram FAB Bank |
| `AIRLINE_API_TIMEOUT` | 5000 ms | ANA |
| `BANKING_API_TIMEOUT` | 5000 ms | FAB Bank, Telegram FAB Bank |

## Session Timeout Values

| Bot | Timeout | Purpose |
|-----|---------|---------|
| FAB Bank (LINE) | 300000 ms (5 min) | Quick banking transactions |
| FAB Bank (Telegram) | 300000 ms (5 min) | Quick banking transactions |
| Sands Hotel | Default (5 min) | Hotel concierge queries |
| ANA Airline | 900000 ms (15 min) | Longer airline booking flow |
