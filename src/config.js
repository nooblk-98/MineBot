import { readFileSync, existsSync } from 'node:fs';

// Config lives at the project root. Prefer config.json; fall back to the
// example so the app still starts if no real config is present.
const root = new URL('../', import.meta.url);
const jsonPath = new URL('config.json', root);
const examplePath = new URL('config.example.json', root);
const configPath = existsSync(jsonPath) ? jsonPath : examplePath;

const config = JSON.parse(readFileSync(configPath));

// Optional env overrides (handy for containers/CI without editing files).
if (process.env.MC_HOST) config.host = process.env.MC_HOST;
if (process.env.MC_PORT) config.port = Number(process.env.MC_PORT);
if (process.env.MC_USERNAME) config.username = process.env.MC_USERNAME;
if (process.env.MC_PASSWORD) config.authmePassword = process.env.MC_PASSWORD;
if (process.env.MC_VERSION) config.version = process.env.MC_VERSION;

export default config;
