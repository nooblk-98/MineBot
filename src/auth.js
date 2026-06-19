import { log } from './logger.js';

// Handles the AuthMe login/register flow for offline-mode servers.
// Returns helpers the bot wires into spawn + chat events.
export function createAuthHandler(bot, config, onSuccess) {
  let done = false;
  let loginSent = false;
  let registerSent = false;

  function sendLogin() {
    if (done || loginSent) return;
    loginSent = true;
    bot.chat(`/login ${config.authmePassword}`);
    log('Sent /login to AuthMe.');
  }

  function sendRegister() {
    if (done || registerSent) return;
    registerSent = true;
    const pw = config.authmePassword;
    bot.chat(`/register ${pw} ${pw}`);
    log('Sent /register to AuthMe.');
  }

  function succeed() {
    if (done) return;
    done = true;
    log('AuthMe login successful.');
    onSuccess();
  }

  // Called when auth confirmation never arrives — proceed anyway.
  function forceProceed() {
    if (done) return;
    done = true;
    log('AuthMe confirmation not detected; proceeding (fallback).');
    onSuccess();
  }

  function onMessage(message) {
    if (done) return;
    const m = message.toLowerCase();

    if (m.includes('logged in') || m.includes('login successful') || m.includes('successful login')) {
      succeed();
    } else if (m.includes('register')) {
      // New account: register, then explicitly log in (some AuthMe setups do
      // NOT auto-login after /register, which causes a login-timeout kick).
      sendRegister();
      setTimeout(sendLogin, 1500);
    } else if (m.includes('login') || m.includes('log in') || m.includes('password')) {
      sendLogin();
    }
  }

  return { sendLogin, onMessage, forceProceed, isDone: () => done };
}
