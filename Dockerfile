# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS api
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node server/src ./src
COPY --chown=node:node server/data ./data
COPY --chown=node:node server/scripts ./scripts
ENV NODE_ENV=production PORT=5000
USER node
EXPOSE 5000
CMD ["node", "src/index.js"]

FROM api AS test
COPY --chown=node:node server/tests ./tests
ENV NODE_ENV=test
CMD ["npm", "test"]

FROM node:22-bookworm-slim AS web-build
WORKDIR /app
COPY package*.json ./
COPY tools ./tools
RUN npm ci --no-audit --no-fund
COPY App.jsx app.json ./
COPY src ./src
COPY assets ./assets
ENV CI=1 EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_API_URL=/api
RUN npm run build:web

FROM caddy:2-alpine AS web
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /app/dist /srv
EXPOSE 80 443
