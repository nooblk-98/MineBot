import { log } from './logger.js';

let timer = null;
let paused = false;

// Lets other modules (sleep/restock navigation) suspend the random movement
// so it doesn't fight the pathfinder's control states.
export function pauseAntiAfk() {
  paused = true;
}

export function resumeAntiAfk() {
  paused = false;
}

export function startAntiAfk(bot, config) {
  const cfg = config.antiAfk;
  if (!cfg.enabled) return;
  stopAntiAfk();

  timer = setInterval(() => {
    if (paused) return;
    try {
      if (cfg.lookAround) {
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() - 0.5) * 0.6;
        bot.look(yaw, pitch, false);
      }
      if (cfg.swingArm) bot.swingArm('right');

      if (cfg.jump) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 400);
      }

      if (cfg.sneakToggle) {
        bot.setControlState('sneak', true);
        setTimeout(() => bot.setControlState('sneak', false), 400);
      }

      if (cfg.smallWalk) {
        const dir = ['forward', 'back', 'left', 'right'][Math.floor(Math.random() * 4)];
        bot.setControlState(dir, true);
        setTimeout(() => bot.setControlState(dir, false), 500);
      }
    } catch (e) {
      log(`Anti-AFK action skipped: ${e.message}`);
    }
  }, cfg.intervalSeconds * 1000);

  log(`Anti-AFK active (every ${cfg.intervalSeconds}s).`);
}

export function stopAntiAfk() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function isAntiAfkRunning() {
  return timer !== null;
}
