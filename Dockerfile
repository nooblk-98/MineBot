# MineBot — 24/7 AFK farm bot (Mineflayer)
FROM node:24-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source + config files
COPY src ./src
COPY config.json config.example.json ./

# Run as the built-in non-root user
USER node

CMD ["node", "src/index.js"]
