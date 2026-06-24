import { log } from './logger.js';
import { gotoNear } from './nav.js';
import { pauseAntiAfk, resumeAntiAfk } from './antiAfk.js';

// Pulls food out of a nearby chest when the bot runs out.
// Core mineflayer only (bot.findBlock + bot.openContainer) — no plugins.
//
// Usage: const restock = createFoodRestock(bot, config);
//        await restock();  // returns true if it withdrew any food
export function createFoodRestock(bot, config) {
  const cfg = config.restock || {};
  const searchRadius = cfg.searchRadius ?? 16;
  const want = cfg.targetFoodCount ?? 64; // how many food items to keep on hand
  let busy = false;

  function hasFood() {
    const foods = bot.registry.foodsByName || {};
    return bot.inventory.items().some((i) => foods[i.name]);
  }

  async function restock() {
    if (busy || hasFood()) return false;
    busy = true;
    pauseAntiAfk();
    try {
      const chestBlock = bot.findBlock({
        matching: (b) => b.name === 'chest' || b.name === 'barrel' || b.name === 'trapped_chest',
        maxDistance: searchRadius,
      });
      if (!chestBlock) {
        log(`Out of food and no chest within ${searchRadius} blocks.`);
        return false;
      }

      // Walk adjacent to the chest — openContainer needs it within reach.
      const arrived = await gotoNear(bot, chestBlock, 2);
      if (!arrived || bot.entity.position.distanceTo(chestBlock.position) > 4) {
        log('Could not get within reach of the chest.');
        return false;
      }

      const chest = await bot.openContainer(chestBlock);
      try {
        const foods = bot.registry.foodsByName || {};
        // Withdraw food items, preferring the highest hunger restore.
        const available = chest
          .containerItems()
          .filter((i) => foods[i.name])
          .sort((a, b) => (foods[b.name].foodPoints || 0) - (foods[a.name].foodPoints || 0));

        if (available.length === 0) {
          log('Nearby chest has no food to withdraw.');
          return false;
        }

        let pulled = 0;
        for (const item of available) {
          if (pulled >= want) break;
          const amount = Math.min(item.count, want - pulled);
          try {
            await chest.withdraw(item.type, item.metadata ?? null, amount);
            pulled += amount;
          } catch (e) {
            log(`Withdraw of ${item.name} failed: ${e.message}`);
          }
        }
        if (pulled > 0) log(`Restocked ${pulled} food item(s) from chest.`);
        return pulled > 0;
      } finally {
        chest.close();
      }
    } catch (e) {
      log(`Restock failed: ${e.message}`);
      return false;
    } finally {
      resumeAntiAfk();
      busy = false;
    }
  }

  return restock;
}
