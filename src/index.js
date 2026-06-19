import { log } from './logger.js';
import { startBot } from './bot.js';

process.on('SIGINT', () => {
  log('Shutting down.');
  process.exit(0);
});

log('Starting MineBot...');
startBot();
