# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS node-base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM node-base AS api-build
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma
RUN npm ci --no-audit --no-fund && npm run prisma:generate
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# One-off index setup and explicitly requested demo seeding use this target.
FROM api-build AS tools

FROM api-build AS api-dependencies
RUN npm prune --omit=dev --no-audit --no-fund

FROM node-base AS api
ENV NODE_ENV=production PORT=5000
WORKDIR /app/server
COPY --from=api-dependencies --chown=node:node /app/server/node_modules ./node_modules
COPY --from=api-build --chown=node:node /app/server/dist ./dist
COPY server/package.json ./
USER node
EXPOSE 5000
CMD ["node", "dist/index.js"]

FROM node-base AS web-build
WORKDIR /app
COPY package*.json ./
COPY tools ./tools
RUN npm ci --no-audit --no-fund
COPY App.tsx app.json tsconfig.json ./
COPY src ./src
ENV CI=1 EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_API_URL=/api
RUN npm run typecheck && npm run build:web

# Reuses the existing security tests, including their root Socket.IO dependency.
FROM web-build AS test
COPY --from=api-build /app/server ./server
COPY server/tests ./server/tests
WORKDIR /app/server
CMD ["npm", "test"]

FROM caddy:2-alpine AS web
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /app/dist /srv
EXPOSE 80 443
