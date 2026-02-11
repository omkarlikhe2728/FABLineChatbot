const crypto = require('crypto');
const logger = require('../utils/logger');

class SignatureValidator {
  // Validate LINE signature with bot-specific secret
  validate(signature, body, channelSecret) {
    if (!signature || !body || !channelSecret) {
      logger.error('Missing signature validation parameters');
      return false;
    }

    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');

    const isValid = hash === signature;

    if (!isValid) {
      logger.warn('Signature validation failed', {
        expectedPrefix: hash.substring(0, 20),
        receivedPrefix: signature.substring(0, 20),
      });
    }

    return isValid;
  }

  // Express middleware for bot-aware signature validation
  middleware() {
    return (req, res, next) => {
      const botId = req.params.botId;
      const signature = req.headers['x-line-signature'];
      const body = req.rawBody || '';

      // Bot will be looked up from registry in app.js
      // This is just the validation logic
      logger.debug(`Validating signature for bot: ${botId}`);

      if (!signature) {
        logger.warn('Missing x-line-signature header');
        return res.status(403).json({ message: 'Missing signature' });
      }

      // Actual validation done in app.js with bot-specific secret
      next();
    };
  }
}

module.exports = new SignatureValidator();
