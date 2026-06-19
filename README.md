# MineBot — 24/7 AFK Farm Bot

A Mineflayer bot that stays logged into a **Java, offline-mode (cracked)** server to
keep your farms loaded and ticking. Handles **AuthMe** login, **anti-AFK** movement,
and **auto-reconnect**.

## Project structure

```
MineBot/
├── src/
│   ├── index.js      # entry point
│   ├── bot.js        # connection + lifecycle wiring
│   ├── auth.js       # AuthMe login/register
│   ├── home.js       # DonutHomes /home + /sethome trigger
│   ├── antiAfk.js    # anti-AFK movement loop
│   ├── config.js     # config loader + env overrides
│   └── logger.js     # timestamped logging
├── config.json       # active settings (incl. AuthMe password)
├── config.example.json
├── Dockerfile
└── docker-compose.yml
```

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Edit `config.json`:
   - `host` / `port` — your server address.
   - `username` — the bot's account name (must already be registered, or it will `/register`).
   - `authmePassword` — the AuthMe password used for `/login` and `/register`.
   - `version` — leave `false` to auto-detect, or set e.g. `"1.20.4"` if detection fails.
   - tweak `antiAfk` and `reconnect` as needed.
3. Run:
   ```
   npm start
   ```

## Notes

- **Version is pinned to `1.20.1` on purpose.** This server runs Folia 26.1.2 with
  ViaVersion + ViaBackwards. Mineflayer's protocol library only goes up to ~1.21.11, so the
  bot connects as an older client and ViaBackwards translates. Every client version **1.20.2
  and newer** stalls in the protocol "configuration" phase through ViaBackwards and never
  spawns. **1.20.1 is the last version before the configuration phase existed**, so it joins
  cleanly. Keep `version` at `"1.20.1"` unless the server or ViaBackwards changes.
- **AuthMe:** The bot sends `/login <password>` on join, and `/register <pw> <pw>` if the
  server asks to register. Make sure the password meets the server's rules. First run on a
  brand-new account may need a manual `/register` if AuthMe has captcha or email steps.
- **Home / farm spot (DonutHomes):** On every login the bot runs `/home <name>` (config
  `home.name`, default `farm`) so it jumps straight to the farm without walking. The home
  `farm` is already set at `-2065.2, 158, -4135.25`.
  - **To move the home to a new spot:** stand the bot there, then broadcast the trigger token
    in chat — from the server console/RCON run `say !setfarmhome` (token = `home.setHomeTrigger`).
    The bot will `/sethome farm` at its current location. Teleport it first (e.g. RCON
    `tp NoobLk_AFK <x> <y> <z>`), confirm it landed, *then* send the trigger.
- **Survival (auto-eat + anti-death):** When hunger drops below `survival.foodThreshold`, the bot
  eats the best food **in its inventory** — so stock it with food (e.g. `/give NoobLk_AFK cooked_beef 64`),
  otherwise it logs a warning and can still starve. Anti-AFK jumping drains hunger over time. On death
  it auto-respawns and runs `/home` again to get back to the farm.
- **Keeping chunks loaded:** Simply staying online near the farm keeps its chunks loaded on
  most servers. The bot homes to the farm on every login, so it's always in position.
- **24/7 running (Docker — recommended):** On any always-on machine with Docker:
  ```
  git clone <this-private-repo> minebot && cd minebot
  docker compose up -d                    # build + run, auto-restarts on crash/reboot
  docker compose logs -f minebot          # watch it connect
  ```
  `config.json` is included in this private repo, so it works out of the box. To change settings
  without rebuilding, edit `config.json` and either uncomment the volume mount in
  `docker-compose.yml` or override values with the `MC_*` env vars.
- **24/7 running (PM2 alternative):** On Windows/Linux without Docker:
  ```
  npm install -g pm2
  pm2 start index.js --name minebot
  pm2 save && pm2 startup
  ```

## Important

Many servers prohibit AFK/macro bots in their rules. Only run this on servers where you have
permission (your own server, or one that allows it). You could be banned otherwise.
