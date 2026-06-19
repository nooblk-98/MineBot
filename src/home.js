import { log } from './logger.js';

// DonutHomes integration.
// On every login, jump straight to the saved home (no walking).
export function teleportHome(bot, config) {
  const h = config.home;
  if (!h || !h.name || !h.teleportOnLogin) return;
  setTimeout(() => {
    bot.chat(`/home ${h.name}`);
    log(`Sent /home ${h.name}.`);
  }, (h.teleportDelaySeconds || 4) * 1000);
}

// To (re)set the home: stand the bot at the spot and broadcast the
// setHomeTrigger token in chat (e.g. from the server console: `say !setfarmhome`).
export function handleHomeTrigger(bot, config, message) {
  const h = config.home;
  if (h && h.setHomeTrigger && message.includes(h.setHomeTrigger)) {
    bot.chat(`/sethome ${h.name}`);
    log(`Trigger '${h.setHomeTrigger}' received -> sent /sethome ${h.name}.`);
  }
}
