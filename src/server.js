require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`FAB Banking Bot listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});
