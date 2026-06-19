import mineflayer from 'mineflayer';
import config from './config.js';
import { log } from './logger.js';
import { startAntiAfk, stopAntiAfk, isAntiAfkRunning } from './antiAfk.js';
import { teleportHome, handleHomeTrigger } from './home.js';
import { createAuthHandler } from './auth.js';
import { startSurvival } from './survival.js';

export function startBot() {
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    auth: 'offline',           // cracked / offline-mode server
    version: config.version || false,
    checkTimeoutInterval: 60 * 1000,
  });

  const auth = createAuthHandler(bot, config, () => {
    teleportHome(bot, config);
    startAntiAfk(bot, config);
    startSurvival(bot, config);
  });

  bot.on('messagestr', (message) => {
    if (!auth.isDone()) {
      auth.onMessage(message);
      return;
    }
    handleHomeTrigger(bot, config, message);
  });

  bot.once('spawn', () => {
    log(`Spawned as ${bot.username}. Attempting AuthMe login in 3s...`);
    setTimeout(auth.sendLogin, 3000);
    // Fallback: if no explicit auth-success message arrives, proceed anyway.
    setTimeout(() => {
      if (!isAntiAfkRunning()) auth.forceProceed();
    }, 12000);
  });

  bot.on('kicked', (reason) => log(`Kicked: ${reason}`));
  bot.on('error', (err) => log(`Error: ${err.message}`));

  bot.on('end', (reason) => {
    stopAntiAfk();
    log(`Disconnected (${reason}).`);
    if (config.reconnect.enabled) {
      log(`Reconnecting in ${config.reconnect.delaySeconds}s...`);
      setTimeout(startBot, config.reconnect.delaySeconds * 1000);
    }
  });
}
