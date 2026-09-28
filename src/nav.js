import pkg from 'mineflayer-pathfinder';
import { log } from './logger.js';

const { pathfinder, Movements, goals } = pkg;
const { GoalNear } = goals;

let loaded = false;
// Serialises navigation: only one goto() may run at a time, otherwise a
// second goal cancels the first ("goal was changed before it completed").
let navChain = Promise.resolve();

// Load the pathfinder plugin once per bot and configure sensible movements.
export function installPathfinder(bot) {
  if (loaded) return;
  bot.loadPlugin(pathfinder);
  bot.once('spawn', () => {
    const movements = new Movements(bot);
    movements.canDig = false; // never tear up the farm to reach a block
    bot.pathfinder.setMovements(movements);
  });
  loaded = true;
}

// True while a navigation is in progress, so callers can skip overlapping work.
export function isNavigating() {
  return navigating;
}
let navigating = false;

// Walk until within `range` blocks of the target block, so it's interactable.
// Serialised against other gotoNear() calls. Returns true on arrival, false
// if no path / timed out.
export function gotoNear(bot, block, range = 2) {
  if (!bot.pathfinder) return Promise.resolve(false);
  const run = navChain.then(async () => {
    navigating = true;
    try {
      const { x, y, z } = block.position;
      await bot.pathfinder.goto(new GoalNear(x, y, z, range));
      return true;
    } catch (e) {
      log(`Navigation failed: ${e.message}`);
      return false;
    } finally {
      navigating = false;
    }
  });
  // Keep the chain alive even if this run rejects (it won't; we catch above).
  navChain = run.catch(() => {});
  return run;
}
