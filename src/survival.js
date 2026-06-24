import { log } from './logger.js';
import { teleportHome } from './home.js';
import { createFoodRestock } from './restock.js';

// Keeps the bot alive over long unattended sessions:
//  - auto-eats when hunger drops below a threshold (needs food in inventory)
//  - respawns and returns home if it dies
export function startSurvival(bot, config) {
  const cfg = config.survival || {};
  if (cfg.autoEat !== false) startAutoEat(bot, cfg, config);
  if (cfg.returnHomeOnDeath !== false) handleDeath(bot, config);
}

function startAutoEat(bot, cfg, config) {
  const threshold = cfg.foodThreshold ?? 18;
  const restock = createFoodRestock(bot, config);
  // Wait for the /home teleport + chunk load to settle before acting, so the
  // first hungry tick doesn't fire restock before the chest is in range.
  const readyAt = Date.now() + (cfg.startupGraceSeconds ?? 12) * 1000;
  let eating = false;
  let warnedNoFood = false;

  function bestFood() {
    const foods = bot.registry.foodsByName || {};
    // Pick the food restoring the most hunger to minimise eating frequency.
    return bot.inventory
      .items()
      .filter((i) => foods[i.name])
      .sort((a, b) => (foods[b.name].foodPoints || 0) - (foods[a.name].foodPoints || 0))[0];
  }

  async function tryEat() {
    if (eating || bot.food === undefined || bot.food > threshold) return;
    if (Date.now() < readyAt) return; // still settling after login/teleport

    let food = bestFood();

    if (!food) {
      // Out of food — try pulling more from a nearby chest before giving up.
      if (config.restock?.enabled !== false && (await restock())) {
        food = bestFood();
      }
    }

    if (!food) {
      if (!warnedNoFood) {
        warnedNoFood = true;
        log(`Hungry (food=${bot.food}) but no food in inventory or nearby chest! Give the bot food (e.g. /give ${bot.username} cooked_beef 64).`);
      }
      return;
    }

    eating = true;
    try {
      await bot.equip(food, 'hand');
      await bot.consume();
      warnedNoFood = false;
      log(`Ate ${food.name} (food now ${bot.food}/20).`);
    } catch (e) {
      log(`Auto-eat failed: ${e.message}`);
    } finally {
      eating = false;
    }
  }

  bot.on('health', tryEat);
  const interval = setInterval(tryEat, (cfg.checkIntervalSeconds ?? 10) * 1000);
  bot.once('end', () => clearInterval(interval));
  log('Auto-eat active.');
}

function handleDeath(bot, config) {
  let died = false;

  bot.on('death', () => {
    died = true;
    log('Bot died — respawning...');
    // Explicit respawn (client_command actionId 0) in case auto-respawn is off.
    setTimeout(() => {
      try {
        bot._client.write('client_command', { actionId: 0 });
      } catch (e) {
        log(`Respawn request failed: ${e.message}`);
      }
    }, 1000);
  });

  bot.on('spawn', () => {
    if (!died) return; // ignore the initial login spawn
    died = false;
    log('Respawned — returning to farm home.');
    teleportHome(bot, config);
  });
}
