import pkg from 'mineflayer-pathfinder';
import { log } from './logger.js';

const { pathfinder, Movements, goals } = pkg;
const { GoalNear } = goals;

let loaded = false;

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

// Walk until within `range` blocks of the target block, so it's interactable.
// Returns true on arrival, false if no path / timed out.
export async function gotoNear(bot, block, range = 2) {
  if (!bot.pathfinder) return false;
  try {
    const { x, y, z } = block.position;
    await bot.pathfinder.goto(new GoalNear(x, y, z, range));
    return true;
  } catch (e) {
    log(`Navigation failed: ${e.message}`);
    return false;
  }
}
