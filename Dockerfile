# MineBot — 24/7 AFK farm bot (Mineflayer)
FROM node:24-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source + example config (real config.json is mounted at runtime)
COPY index.js ./
COPY config.example.json ./

# Run as the built-in non-root user
USER node

CMD ["node", "index.js"]
