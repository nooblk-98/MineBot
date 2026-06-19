import mineflayer from 'mineflayer';
import { readFileSync, existsSync } from 'node:fs';

// Prefer config.json (kept out of git — holds the AuthMe password). Fall back to
// the committed example so the image still runs if no config is mounted.
const configPath = existsSync(new URL('./config.json', import.meta.url))
  ? new URL('./config.json', import.meta.url)
  : new URL('./config.example.json', import.meta.url);
const config = JSON.parse(readFileSync(configPath));

// Optional env overrides (handy for containers/CI without editing files).
if (process.env.MC_HOST) config.host = process.env.MC_HOST;
if (process.env.MC_PORT) config.port = Number(process.env.MC_PORT);
if (process.env.MC_USERNAME) config.username = process.env.MC_USERNAME;
if (process.env.MC_PASSWORD) config.authmePassword = process.env.MC_PASSWORD;
if (process.env.MC_VERSION) config.version = process.env.MC_VERSION;

function log(msg) {
  const t = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${t}] ${msg}`);
}

let antiAfkTimer = null;
let loginDone = false;
let registerSent = false;
let loginSent = false;

function startBot() {
  loginDone = false;
  registerSent = false;
  loginSent = false;

  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    auth: 'offline',           // cracked / offline-mode server
    version: config.version || false,
    checkTimeoutInterval: 60 * 1000,
  });

  // ---- AuthMe login/register ----------------------------------------------
  // AuthMe forces /login (or /register on first join). We watch chat for its
  // prompts and respond. Sending right after spawn covers most servers too.
  function sendLogin() {
    if (loginDone || loginSent) return;
    loginSent = true;
    bot.chat(`/login ${config.authmePassword}`);
    log('Sent /login to AuthMe.');
  }

  function sendRegister() {
    if (loginDone || registerSent) return;
    registerSent = true;
    const pw = config.authmePassword;
    bot.chat(`/register ${pw} ${pw}`);
    log('Sent /register to AuthMe.');
  }

  function authSuccess() {
    if (loginDone) return;
    loginDone = true;
    log('AuthMe login successful.');
    handleHome(bot);
    startAntiAfk(bot);
  }

  bot.on('messagestr', (message) => {
    const m = message.toLowerCase();

    // --- AuthMe flow (until authenticated) ---
    if (!loginDone) {
      if (m.includes('logged in') || m.includes('login successful') || m.includes('successful login')) {
        authSuccess();
      } else if (m.includes('register')) {
        // New account: register, then explicitly log in (some AuthMe setups
        // do NOT auto-login after /register, which causes a login-timeout kick).
        sendRegister();
        setTimeout(sendLogin, 1500);
      } else if (m.includes('login') || m.includes('log in') || m.includes('password')) {
        sendLogin();
      }
      return;
    }

    // --- After login: chat trigger to (re)set the home at the bot's current spot ---
    const h = config.home;
    if (h && h.setHomeTrigger && message.includes(h.setHomeTrigger)) {
      bot.chat(`/sethome ${h.name}`);
      log(`Trigger '${h.setHomeTrigger}' received -> sent /sethome ${h.name}.`);
    }
  });

  // ---- Lifecycle -----------------------------------------------------------
  bot.once('spawn', () => {
    log(`Spawned as ${bot.username}. Attempting AuthMe login in 3s...`);
    setTimeout(sendLogin, 3000);
    // Fallback: if no explicit "success" message arrives, proceed anyway.
    setTimeout(() => {
      if (!antiAfkTimer) {
        loginDone = true;
        log('AuthMe confirmation not detected; proceeding (fallback).');
        handleHome(bot);
        startAntiAfk(bot);
      }
    }, 12000);
  });

  bot.on('kicked', (reason) => log(`Kicked: ${reason}`));
  bot.on('error', (err) => log(`Error: ${err.message}`));

  bot.on('end', (reason) => {
    stopAntiAfk();
    log(`Disconnected (${reason}).`);
    if (config.reconnect.enabled) {
      const delay = config.reconnect.delaySeconds * 1000;
      log(`Reconnecting in ${config.reconnect.delaySeconds}s...`);
      setTimeout(startBot, delay);
    }
  });
}

// ---- Home (DonutHomes /home and /sethome) ---------------------------------
// On every login, jump straight to the saved home (no walking).
// To (re)set the home: stand the bot at the spot and broadcast the
// setHomeTrigger token in chat (e.g. via RCON `say`) — handled above.
function handleHome(bot) {
  const h = config.home;
  if (!h || !h.name || !h.teleportOnLogin) return;
  setTimeout(() => {
    bot.chat(`/home ${h.name}`);
    log(`Sent /home ${h.name}.`);
  }, (h.teleportDelaySeconds || 4) * 1000);
}

// ---- Anti-AFK --------------------------------------------------------------
function startAntiAfk(bot) {
  const cfg = config.antiAfk;
  if (!cfg.enabled) return;
  stopAntiAfk();

  antiAfkTimer = setInterval(() => {
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

function stopAntiAfk() {
  if (antiAfkTimer) {
    clearInterval(antiAfkTimer);
    antiAfkTimer = null;
  }
}

process.on('SIGINT', () => {
  log('Shutting down.');
  process.exit(0);
});

log('Starting MineBot...');
startBot();
