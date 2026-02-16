# Telegram FAB Bank Bot - Deployment Guide

Complete guide for deploying the Telegram FAB Bank Bot to production.

## Pre-Deployment Checklist

### Development Environment
- [ ] Bot runs locally without errors: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] No console errors
- [ ] Health check works: `curl http://localhost:3000/health/telegram-fabbank`

### Configuration
- [ ] `.env.telegram-fabbank` created with all required variables
- [ ] `config/telegram-fabbank.json` configured correctly
- [ ] `config/bots.json` includes telegram-fabbank entry
- [ ] Banking API URL verified
- [ ] Live chat middleware URL verified

### Telegram Bot Setup
- [ ] Bot created with @BotFather
- [ ] Bot token saved securely
- [ ] Bot commands set up (optional but recommended)

## Step 1: Create Telegram Bot

### Via @BotFather

```
1. Open Telegram app
2. Search for @BotFather
3. Send /newbot
4. Choose a bot name (e.g., "FAB Bank Bot")
5. Choose a bot username (e.g., @fabbank_bot)
6. Save the token: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### Set Bot Commands (Optional)

```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setMyCommands \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Start the bot"},
      {"command": "menu", "description": "Show main menu"},
      {"command": "help", "description": "Get help"}
    ]
  }'
```

### Set Bot Description (Optional)

```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setMyDescription \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Your FAB Bank assistant. Check balance, manage cards, and get 24/7 support."
  }'
```

## Step 2: Prepare Server

### Domain & HTTPS

**Telegram requires HTTPS webhook URL** - no HTTP allowed.

```bash
# Example production domain
https://bots.fabbank.com/webhook/telegram-fabbank

# Must have valid SSL certificate
# Use Let's Encrypt (free): https://letsencrypt.org
```

### Install Dependencies

```bash
cd /path/to/FABLineChatbot
npm install
```

### Environment Variables

Create `.env.telegram-fabbank` in project root:

```env
# Required: Bot Token from @BotFather
TELEGRAM_FABBANK_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Banking API
TELEGRAM_FABBANK_BANKING_API_URL=https://api.fabbank.com
TELEGRAM_FABBANK_BANKING_API_TIMEOUT=5000

# Live Chat
TELEGRAM_FABBANK_LIVE_CHAT_API_URL=https://livechat-middleware.fabbank.com

# Bot Settings
TELEGRAM_FABBANK_BOT_NAME=FAB Bank Telegram Bot
TELEGRAM_FABBANK_SESSION_TIMEOUT=300000
TELEGRAM_FABBANK_OTP_EXPIRY=300
TELEGRAM_FABBANK_WELCOME_IMAGE=https://www.bankfab.com/images/banner.jpg
```

### Enable in Bot Registry

Update `config/bots.json`:

```json
{
  "id": "telegram-fabbank",
  "enabled": true,
  "platform": "telegram",
  "envFile": ".env.telegram-fabbank",
  "configFile": "config/telegram-fabbank.json",
  "modulePath": "./bots/telegram-fabbank"
}
```

## Step 3: Deploy Application

### Option A: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t fabbank-telegram-bot .
docker run -d \
  --name fabbank-telegram \
  -p 3000:3000 \
  -e TELEGRAM_FABBANK_BOT_TOKEN=<TOKEN> \
  -e TELEGRAM_FABBANK_BANKING_API_URL=https://api.fabbank.com \
  -e TELEGRAM_FABBANK_LIVE_CHAT_API_URL=https://livechat-middleware.fabbank.com \
  fabbank-telegram-bot
```

### Option B: PM2 Deployment

Install PM2:

```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'fabbank-telegram',
      script: './src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/telegram-error.log',
      out_file: './logs/telegram-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000
    }
  ]
};
```

Deploy:

```bash
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save
```

### Option C: Manual Deployment

```bash
# SSH into server
ssh user@server.com

# Navigate to project
cd /var/www/fabbank-telegram

# Install dependencies
npm install --production

# Start server (use nohup or systemd)
nohup npm start > logs/app.log 2>&1 &

# Or use systemd service
sudo systemctl start fabbank-telegram
```

## Step 4: Configure Telegram Webhook

### Set Webhook URL

```bash
curl -F "url=https://bots.fabbank.com/webhook/telegram-fabbank" \
     https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

Replace `<BOT_TOKEN>` with your actual token and `bots.fabbank.com` with your domain.

### Verify Webhook

```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

Expected response:

```json
{
  "ok": true,
  "result": {
    "url": "https://bots.fabbank.com/webhook/telegram-fabbank",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "1.2.3.4",
    "last_error_date": 0
  }
}
```

### Test Webhook

Send a test message from Telegram:

1. Open Telegram app
2. Search for your bot (@fabbank_bot)
3. Send `/start` command
4. Check server logs for incoming webhook

```bash
tail -f logs/app.log | grep "telegram webhook"
```

Expected log:
```
📱 Telegram webhook received for bot: telegram-fabbank
```

## Step 5: Monitoring & Logging

### Configure Logging

Create `logs/` directory:

```bash
mkdir -p logs
```

### Monitor Application

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs fabbank-telegram

# Check resource usage
pm2 monit
```

### Health Check

Setup periodic health checks:

```bash
# Cron job every 5 minutes
*/5 * * * * curl -f https://bots.fabbank.com/health/telegram-fabbank || echo "Bot unhealthy"
```

## Step 6: SSL/TLS Configuration

### Using Nginx with Let's Encrypt

Install Certbot:

```bash
sudo apt-get install certbot python3-certbot-nginx
```

Configure Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name bots.fabbank.com;

    ssl_certificate /etc/letsencrypt/live/bots.fabbank.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bots.fabbank.com/privkey.pem;

    location /webhook/telegram-fabbank {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:3000;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name bots.fabbank.com;
    return 301 https://$server_name$request_uri;
}
```

Obtain certificate:

```bash
sudo certbot certonly --nginx -d bots.fabbank.com
```

## Step 7: Production Checklist

### Before Going Live

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Webhook URL set correctly with Telegram
- [ ] Webhook test successful
- [ ] Health check endpoint responsive
- [ ] Logging configured and working
- [ ] Error monitoring in place
- [ ] Backup strategy configured
- [ ] Rate limiting in place (if needed)
- [ ] Database backups scheduled
- [ ] Rollback plan documented

### First 24 Hours

- [ ] Monitor error logs closely
- [ ] Check webhook delivery success rate
- [ ] Verify banking API integration works
- [ ] Test all features with real users
- [ ] Monitor response times
- [ ] Check session management
- [ ] Verify live chat integration

## Step 8: Post-Deployment Monitoring

### Key Metrics to Monitor

```bash
# Webhook success rate
grep "telegram webhook" logs/app.log | wc -l

# Error rate
grep "ERROR" logs/app.log | wc -l

# Response times (check average)
grep "Dialog:" logs/app.log | tail -100

# Active sessions
curl https://bots.fabbank.com/health/telegram-fabbank

# Bot uptime
pm2 status | grep fabbank-telegram
```

### Alert Thresholds

Setup alerts for:
- Error rate > 5% per hour
- Response time > 2 seconds (p95)
- Webhook failures > 10 per hour
- Bot restarts > 1 per day
- Memory usage > 80%

## Troubleshooting Deployment

### Bot Not Responding

1. Check webhook URL:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

2. Check server running:
   ```bash
   curl https://bots.fabbank.com/health/telegram-fabbank
   ```

3. Check logs:
   ```bash
   tail -f logs/error.log
   ```

4. Verify HTTPS certificate:
   ```bash
   curl -v https://bots.fabbank.com
   ```

### High Error Rate

1. Check banking API connectivity:
   ```bash
   curl https://api.fabbank.com/health
   ```

2. Check live chat middleware:
   ```bash
   curl https://livechat-middleware.fabbank.com/health
   ```

3. Increase logging verbosity:
   ```bash
   NODE_DEBUG=* npm start
   ```

### Session Issues

1. Check session store:
   - Sessions stored in-memory (in-memory Map)
   - No persistent storage yet
   - Sessions lost on restart

2. Monitor session creation:
   ```bash
   grep "Session created" logs/app.log
   ```

### Performance Issues

1. Scale with PM2:
   ```bash
   pm2 scale fabbank-telegram +2
   ```

2. Add caching for frequently accessed data
3. Implement rate limiting for API calls
4. Monitor memory usage:
   ```bash
   pm2 monit
   ```

## Rollback Procedure

If deployment fails:

```bash
# Stop new version
pm2 stop fabbank-telegram

# Revert code
git checkout previous-version

# Install dependencies
npm install

# Start previous version
pm2 start ecosystem.config.js

# Verify
curl https://bots.fabbank.com/health/telegram-fabbank
```

## Scaling

### Horizontal Scaling

Use PM2 in cluster mode:

```javascript
// ecosystem.config.js
instances: 4,  // or more based on CPU cores
exec_mode: 'cluster'
```

### Load Balancing

Use Nginx upstream:

```nginx
upstream telegram_bots {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    location /webhook/telegram-fabbank {
        proxy_pass http://telegram_bots;
    }
}
```

## Database Upgrades

Currently uses in-memory sessions. For production, consider:

### Upgrade Path (Future)

1. **Redis** for distributed sessions
2. **PostgreSQL** for persistent storage
3. **MongoDB** for audit logs

This is documented in [MEMORY.md](./MEMORY.md) - Redis upgrade path.

## Security Best Practices

1. **Rotate Telegram Token**
   ```bash
   # In @BotFather: /revoke token, /newbot
   ```

2. **Update Dependencies**
   ```bash
   npm audit fix
   npm update
   ```

3. **Monitor Logs**
   ```bash
   grep "signature validation failed" logs/app.log
   ```

4. **Backup Configuration**
   ```bash
   cp .env.telegram-fabbank .env.telegram-fabbank.backup
   ```

5. **Regular Security Audits**
   ```bash
   npm audit
   ```

## Backup & Recovery

### Daily Backups

```bash
# Backup configuration
cp .env.telegram-fabbank backups/.env.telegram-fabbank.$(date +%Y%m%d)
cp config/telegram-fabbank.json backups/config.$(date +%Y%m%d).json
```

### Recovery

```bash
# Restore from backup
cp backups/.env.telegram-fabbank.20260216 .env.telegram-fabbank
npm restart
```

## Support & Incident Response

### Incident Response Plan

1. **Detection** - Health check fails
2. **Investigation** - Check logs and metrics
3. **Mitigation** - Rollback or fix
4. **Recovery** - Redeploy and verify
5. **Post-Mortem** - Document issue and fix

### Escalation Path

- Level 1: Auto-restart via PM2
- Level 2: Page on-call engineer
- Level 3: Emergency rollback
- Level 4: Full incident review

---

**Version**: 1.0.0
**Last Updated**: February 16, 2026
**Maintained by**: FAB Bank Development Team
