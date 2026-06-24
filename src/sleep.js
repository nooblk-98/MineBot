import { log } from './logger.js';
import { gotoNear } from './nav.js';
import { pauseAntiAfk, resumeAntiAfk } from './antiAfk.js';

// Auto-sleep: when night falls (or a thunderstorm hits), find a nearby bed and
// sleep in it. Mineflayer only lets you sleep when the server allows it, so we
// poll on a timer and let bot.sleep() reject when it isn't sleepable yet.
//
// timeOfDay is 0..24000; beds become usable from ~12541 (dusk) to ~23458.
export function startSleep(bot, config) {
  const cfg = config.sleep || {};
  if (cfg.enabled === false) return;

  const searchRadius = cfg.searchRadius ?? 16;
  const intervalMs = (cfg.checkIntervalSeconds ?? 10) * 1000;
  let busy = false;

  function isNight() {
    const t = bot.time?.timeOfDay;
    return t !== undefined && t >= 12541 && t <= 23458;
  }

  async function trySleep() {
    if (busy || bot.isSleeping) return;
    if (!isNight() && !bot.thunderState) return;

    const bed = bot.findBlock({
      matching: (block) => bot.isABed(block),
      maxDistance: searchRadius,
    });
    if (!bed) return; // no bed in range; antiAfk keeps us alive instead

    busy = true;
    pauseAntiAfk();
    try {
      // Walk adjacent to the bed — interaction range is only ~3 blocks.
      await gotoNear(bot, bed, 2);
      await bot.sleep(bed);
      log('Sleeping through the night.');
    } catch (e) {
      // Common, expected rejections: not night yet, monsters nearby, bed
      // occupied/obstructed, or briefly out of reach. Only surface the rest.
      if (!/can only sleep at night|not night|too far|cant click the bed|occupied|monster/i.test(e.message)) {
        log(`Sleep failed: ${e.message}`);
      }
    } finally {
      resumeAntiAfk();
      busy = false;
    }
  }

  bot.on('wake', () => log('Woke up — good morning.'));

  const interval = setInterval(trySleep, intervalMs);
  bot.once('end', () => clearInterval(interval));
  log(`Auto-sleep active (bed search radius ${searchRadius}).`);
}
