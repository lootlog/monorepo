FROM node:25-alpine3.22 AS base

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.20.0

FROM base AS build
WORKDIR /usr/src/app

ARG VITE_API_URL
ARG VITE_SEARCH_API_URL
ARG VITE_AUTH_SERVICE_URL
ARG VITE_GATEWAY_URL
ARG VITE_GATEWAY_SOCKET_PATH
ARG VITE_BATTLELOG_API_URL
ARG VITE_ACTIVITY_API_URL
ARG VITE_ADDON_INSTALL_URL
ARG VITE_BATTLELOG_PUBLIC_URL
ARG VITE_DISCORD_CLIENT_ID
ARG VITE_DISCORD_BOT_PERMISSIONS
ARG VITE_LOOTLOG_APP_URL
ARG NEXT_PUBLIC_AUTH_SERVICE_URL
ARG NEXT_PUBLIC_ADDON_URL
ARG GAME_CLIENT_URL

ENV VITE_API_URL="${VITE_API_URL}" \
    VITE_SEARCH_API_URL="${VITE_SEARCH_API_URL}" \
    VITE_AUTH_SERVICE_URL="${VITE_AUTH_SERVICE_URL}" \
    VITE_GATEWAY_URL="${VITE_GATEWAY_URL}" \
    VITE_GATEWAY_SOCKET_PATH="${VITE_GATEWAY_SOCKET_PATH}" \
    VITE_BATTLELOG_API_URL="${VITE_BATTLELOG_API_URL}" \
    VITE_ACTIVITY_API_URL="${VITE_ACTIVITY_API_URL}" \
    VITE_ADDON_INSTALL_URL="${VITE_ADDON_INSTALL_URL}" \
    VITE_BATTLELOG_PUBLIC_URL="${VITE_BATTLELOG_PUBLIC_URL}" \
    VITE_DISCORD_CLIENT_ID="${VITE_DISCORD_CLIENT_ID}" \
    VITE_DISCORD_BOT_PERMISSIONS="${VITE_DISCORD_BOT_PERMISSIONS}" \
    VITE_LOOTLOG_APP_URL="${VITE_LOOTLOG_APP_URL}" \
    NEXT_PUBLIC_AUTH_SERVICE_URL="${NEXT_PUBLIC_AUTH_SERVICE_URL}" \
    NEXT_PUBLIC_ADDON_URL="${NEXT_PUBLIC_ADDON_URL}" \
    GAME_CLIENT_URL="${GAME_CLIENT_URL}"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/

RUN find ./apps -name "*.ts" -delete && \
    find ./apps -name "*.tsx" -delete && \
    find ./apps -name "*.js" -delete && \
    find ./apps -name "*.jsx" -delete && \
    find ./apps -name "src" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./packages -name "*.ts" -delete && \
    find ./packages -name "*.tsx" -delete && \
    find ./packages -name "*.js" -delete && \
    find ./packages -name "*.jsx" -delete && \
    find ./packages -name "src" -type d -exec rm -rf {} + 2>/dev/null || true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline

COPY . .

RUN pnpm run build --filter=!@lootlog/landing --filter=!@lootlog/web --filter=!@lootlog/game-client
RUN pnpm --filter @lootlog/web build && \
    pnpm --filter @lootlog/landing build && \
    pnpm --filter @lootlog/game-client build

RUN find ./packages -name "src" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./packages -name "*.ts" -not -path "*/dist/*" -delete && \
    find ./packages -name "*.tsx" -not -path "*/dist/*" -delete

RUN pnpm deploy --filter=@lootlog/api --prod /prod/api && \
    pnpm deploy --filter=@lootlog/auth --prod /prod/auth && \
    pnpm deploy --filter=@lootlog/search --prod /prod/search && \
    pnpm deploy --filter=@lootlog/discord-bot --prod /prod/discord-bot && \
    pnpm deploy --filter=@lootlog/gateway --prod /prod/gateway && \
    pnpm deploy --filter=@lootlog/battlelog-service --prod /prod/battlelog-service && \
    pnpm deploy --filter=@lootlog/activity --prod /prod/activity

FROM base AS auth

LABEL org.opencontainers.image.title="Lootlog Auth Service"
LABEL org.opencontainers.image.description="Authentication service with Discord OAuth and JWT"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build --chown=nodejs:nodejs --chmod=755 /prod/auth /prod/auth
WORKDIR /prod/auth

USER nodejs

EXPOSE 4000

ENV NODE_OPTIONS="--no-strip-types"

ENTRYPOINT ["dumb-init", "--"]

CMD ["pnpm", "start"]

FROM base AS search

LABEL org.opencontainers.image.title="Lootlog Search Service"
LABEL org.opencontainers.image.description="Meilisearch indexing service"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build --chown=nodejs:nodejs --chmod=755 /prod/search /prod/search
WORKDIR /prod/search

USER nodejs

EXPOSE 4000

ENV NODE_OPTIONS="--no-strip-types"

ENTRYPOINT ["dumb-init", "--"]

CMD ["pnpm", "start"]

FROM base AS api

LABEL org.opencontainers.image.title="Lootlog API Service"
LABEL org.opencontainers.image.description="Main API service for guilds, loots, timers, and NPCs"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build --chown=nodejs:nodejs --chmod=755 /prod/api /prod/api
WORKDIR /prod/api

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["pnpm", "start"]

FROM base AS discord-bot

LABEL org.opencontainers.image.title="Lootlog Discord Bot"
LABEL org.opencontainers.image.description="Discord bot for guild notifications and commands"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build --chown=nodejs:nodejs --chmod=755 /prod/discord-bot /prod/discord-bot
WORKDIR /prod/discord-bot

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["pnpm", "start"]

FROM base AS gateway

LABEL org.opencontainers.image.title="Lootlog Gateway Service"
LABEL org.opencontainers.image.description="Socket.IO gateway for real-time events"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build --chown=nodejs:nodejs --chmod=755 /prod/gateway /prod/gateway
WORKDIR /prod/gateway

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["pnpm", "start"]

FROM base AS battlelog-service

LABEL org.opencontainers.image.title="Lootlog Battlelog Service"
LABEL org.opencontainers.image.description="Battle statistics and warrior tracking service"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build --chown=nodejs:nodejs --chmod=755 /prod/battlelog-service /prod/battlelog-service
WORKDIR /prod/battlelog-service

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["pnpm", "start"]

FROM base AS activity

LABEL org.opencontainers.image.title="Lootlog Activity Service"
LABEL org.opencontainers.image.description="Activity and event logging service with TimescaleDB"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build --chown=nodejs:nodejs --chmod=755 /prod/activity /prod/activity
WORKDIR /prod/activity

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["pnpm", "start"]

FROM build AS auth-migrate
WORKDIR /usr/src/app/apps/auth
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "auth:migrate:prod"]

FROM build AS api-migrate
WORKDIR /usr/src/app/apps/api
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM build AS battlelog-migrate
WORKDIR /usr/src/app/apps/battlelog-service
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM build AS activity-migrate
WORKDIR /usr/src/app/apps/activity
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM nginx:1.27-alpine AS web

LABEL org.opencontainers.image.title="Lootlog Web App"
LABEL org.opencontainers.image.description="Lootlog dashboard single-page application"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY deploy/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

FROM nginx:1.27-alpine AS landing

LABEL org.opencontainers.image.title="Lootlog Landing Page"
LABEL org.opencontainers.image.description="Lootlog static landing and docs site"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY deploy/nginx/landing.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/apps/landing/out /usr/share/nginx/html

EXPOSE 80

FROM nginx:1.27-alpine AS game-client

LABEL org.opencontainers.image.title="Lootlog Game Client"
LABEL org.opencontainers.image.description="Lootlog userscript distribution"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY deploy/nginx/game-client.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/apps/game-client/dist /usr/share/nginx/html

EXPOSE 80
