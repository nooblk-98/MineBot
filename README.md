<div align="center">

# MineBot

**A 24/7 AFK Minecraft bot that keeps your farms loaded and ticking.**

[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Mineflayer](https://img.shields.io/badge/Mineflayer-4.x-8B5A2B)](https://github.com/PrismarineJS/mineflayer)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)

[Features](#features) • [Getting started](#getting-started) • [Configuration](#configuration) • [Running 24/7](#running-247) • [How it works](#how-it-works) • [Troubleshooting](#troubleshooting)

</div>

MineBot is a [Mineflayer](https://github.com/PrismarineJS/mineflayer) bot built for **Java Edition, offline-mode servers** running [AuthMe](https://www.spigotmc.org/resources/authmereloaded.6269/). It logs in, teleports to your farm, and stays there indefinitely: eating, sleeping, restocking food, and reconnecting on its own so the chunks around your farm never unload.

> [!WARNING]
> Many servers forbid AFK or macro bots. Only run MineBot on servers you own or where bots are explicitly allowed, or you risk being banned.

## Features

- **AuthMe login**: sends `/login` on join, and `/register` automatically for new accounts.
- **Home teleport**: runs `/home <name>` after every login and respawn, so the bot is always at the farm.
- **Anti-AFK**: periodic jumping, arm swings, looking around and small steps to avoid idle kicks.
- **Auto-eat**: eats the most filling food in its inventory when hunger drops below a threshold.
- **Food restock**: pulls food from a nearby chest, barrel or trapped chest when it runs out.
- **Auto-sleep**: walks to a nearby bed and sleeps at night or during thunderstorms.
- **Death recovery**: respawns and returns home automatically.
- **Auto-reconnect**: rejoins after kicks, crashes or server restarts.
- **Safe pathfinding**: uses [mineflayer-pathfinder](https://github.com/PrismarineJS/mineflayer-pathfinder) with digging disabled, so it never breaks your farm.
- **Docker-ready**: one command to run it as an always-on service.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) (a recent LTS; the Docker image uses Node 24) or [Docker](https://www.docker.com)
- A Java Edition server in **offline mode** with an AuthMe-style login
- Optional: a homes plugin providing `/home` and `/sethome` (e.g. DonutHomes)

### Installation

```bash
git clone https://github.com/nooblk-98/MineBot.git
cd MineBot
npm install
```

Create your config from the example and fill in your server details and AuthMe password:

```bash
cp config.example.json config.json
```

Then start the bot:

```bash
npm start
```

> [!TIP]
> Keep `config.json` out of version control because it contains your AuthMe password. If `config.json` is missing, MineBot falls back to `config.example.json`.

## Configuration

All settings live in `config.json`. The main options are:

| Key | Description | Default |
| --- | --- | --- |
| `host` / `port` | Server address | `25565` |
| `version` | Client protocol version (`false` to auto-detect) | `"1.20.1"` |
| `username` | Bot account name | |
| `authmePassword` | Password used for `/login` and `/register` | `""` |
| `antiAfk.intervalSeconds` | Delay between anti-AFK actions (toggle `jump`, `swingArm`, `lookAround`, `sneakToggle`, `smallWalk` individually) | `30` |
| `reconnect.enabled` / `delaySeconds` | Rejoin after disconnect, and how long to wait | `true` / `15` |
| `home.name` | Home to teleport to on login and respawn | `"farm"` |
| `home.teleportOnLogin` | Run `/home` after login | `true` |
| `home.setHomeTrigger` | Chat token that makes the bot run `/sethome` | `"!setfarmhome"` |
| `survival.foodThreshold` | Eat when hunger falls to this level (0–20) | `18` |
| `survival.startupGraceSeconds` | Wait after login before eating/restocking, so the teleport settles | `12` |
| `survival.returnHomeOnDeath` | Respawn and `/home` after dying | `true` |
| `sleep.enabled` / `searchRadius` | Auto-sleep and how far to look for a bed | `true` / `16` |
| `restock.enabled` / `searchRadius` | Chest restocking and how far to look for a container | `true` / `16` |
| `restock.targetFoodCount` | How many food items to withdraw | `64` |

### Environment overrides

Connection settings can be overridden without editing the file, which is handy for containers:

| Variable | Overrides |
| --- | --- |
| `MC_HOST` | `host` |
| `MC_PORT` | `port` |
| `MC_USERNAME` | `username` |
| `MC_PASSWORD` | `authmePassword` |
| `MC_VERSION` | `version` |

## Running 24/7

### Docker (recommended)

```bash
docker compose up -d
docker compose logs -f minebot
```

The container restarts automatically on crashes and reboots (`restart: unless-stopped`).

> [!IMPORTANT]
> The image copies `config.json` at build time, so create it before building. To change settings without rebuilding, uncomment the volume mount in [docker-compose.yml](docker-compose.yml), or set `MC_*` variables under `environment`.

### PM2

Without Docker, use [PM2](https://pm2.keymetrics.io) to keep the process alive:

```bash
npm install -g pm2
pm2 start src/index.js --name minebot
pm2 save && pm2 startup
```

## How it works

After spawning, the bot sends `/login` and waits for AuthMe to confirm. If no confirmation arrives within about 12 seconds it proceeds anyway. Once logged in it teleports home and starts the anti-AFK, survival and sleep loops. Any tasks that need to walk (reaching a bed or chest) pause anti-AFK and share a single navigation queue, so goals never cancel each other.

```
src/
├── index.js      # Entry point
├── bot.js        # Connection, lifecycle and reconnect
├── auth.js       # AuthMe login/register
├── home.js       # /home teleport and /sethome trigger
├── antiAfk.js    # Anti-AFK movement loop
├── survival.js   # Auto-eat and death recovery
├── restock.js    # Food restock from nearby chests
├── sleep.js      # Auto-sleep in nearby beds
├── nav.js        # Pathfinder setup and navigation queue
├── config.js     # Config loader and env overrides
└── logger.js     # Timestamped logging
```

### Moving the farm home

1. Teleport the bot to the new spot, e.g. from the console: `tp <bot-name> <x> <y> <z>`.
2. Confirm it landed, then broadcast the trigger token: `say !setfarmhome`.
3. The bot runs `/sethome <home.name>` at its current position.

### Keeping it fed

Give the bot food (e.g. `/give <bot-name> cooked_beef 64`) or place a chest of food within `restock.searchRadius` blocks of the farm home. Anti-AFK jumping drains hunger over time, so a bot without food will eventually starve.

## Troubleshooting

<details>
<summary><strong>The bot connects but never spawns</strong></summary>

If your server translates versions with ViaVersion + ViaBackwards (for example a newer Paper/Folia server), keep `version` at `"1.20.1"`. Client versions **1.20.2 and newer** go through the protocol *configuration* phase, which can stall through ViaBackwards so the bot never spawns. 1.20.1 is the last version before that phase existed, so it joins cleanly.

</details>

<details>
<summary><strong>The bot is kicked for a login timeout</strong></summary>

Check that `authmePassword` matches the account and meets the server's password rules. If AuthMe requires a captcha or email on registration, register the account manually once.

</details>

<details>
<summary><strong>"Hungry but no food in inventory or nearby chest"</strong></summary>

The bot has no food and cannot find a container within `restock.searchRadius`. Give it food or place a stocked chest near the farm home.

</details>
