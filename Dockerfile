# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.4.0

FROM oven/bun:${BUN_VERSION}-alpine AS runtime-base

RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init fontconfig ttf-dejavu

ENV NODE_ENV=production
WORKDIR /usr/src/app

FROM oven/bun:${BUN_VERSION}-alpine AS build-base

RUN apk upgrade --no-cache && apk add --no-cache git

ENV HUSKY=0
ENV TURBO_TELEMETRY_DISABLED=1
WORKDIR /usr/src/app

# Turbo's Bun-aware prune output contains a reduced bun.lock and only the
# workspace manifests needed by the selected deployable application.

FROM build-base AS pruner-api
COPY . .
RUN bunx turbo prune @lootlog/api --docker --out-dir /pruned

FROM build-base AS build-api
COPY --from=pruner-api /pruned/json/ .
COPY --from=pruner-api /usr/src/app/patches ./patches
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY --from=pruner-api /pruned/full/ .
RUN bunx turbo run build --filter=@lootlog/api

FROM build-base AS production-api
COPY --from=pruner-api /pruned/json/ .
COPY --from=pruner-api /usr/src/app/patches ./patches
COPY --from=pruner-api /pruned/full/ .
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production
COPY --from=build-api /usr/src/app/apps/api/dist ./apps/api/dist

FROM build-base AS pruner-auth
COPY . .
RUN bunx turbo prune @lootlog/auth --docker --out-dir /pruned

FROM build-base AS build-auth
COPY --from=pruner-auth /pruned/json/ .
COPY --from=pruner-auth /usr/src/app/patches ./patches
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY --from=pruner-auth /pruned/full/ .
RUN bunx turbo run build --filter=@lootlog/auth

FROM build-base AS production-auth
COPY --from=pruner-auth /pruned/json/ .
COPY --from=pruner-auth /usr/src/app/patches ./patches
COPY --from=pruner-auth /pruned/full/ .
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production
COPY --from=build-auth /usr/src/app/apps/auth/dist ./apps/auth/dist

FROM build-base AS pruner-search
COPY . .
RUN bunx turbo prune @lootlog/search --docker --out-dir /pruned

FROM build-base AS build-search
COPY --from=pruner-search /pruned/json/ .
COPY --from=pruner-search /usr/src/app/patches ./patches
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY --from=pruner-search /pruned/full/ .
RUN bunx turbo run build --filter=@lootlog/search

FROM build-base AS production-search
COPY --from=pruner-search /pruned/json/ .
COPY --from=pruner-search /usr/src/app/patches ./patches
COPY --from=pruner-search /pruned/full/ .
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production
COPY --from=build-search /usr/src/app/apps/search/dist ./apps/search/dist

FROM build-base AS pruner-discord-bot
COPY . .
RUN bunx turbo prune @lootlog/discord-bot --docker --out-dir /pruned

FROM build-base AS build-discord-bot
COPY --from=pruner-discord-bot /pruned/json/ .
COPY --from=pruner-discord-bot /usr/src/app/patches ./patches
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY --from=pruner-discord-bot /pruned/full/ .
RUN bunx turbo run build --filter=@lootlog/discord-bot

FROM build-base AS production-discord-bot
COPY --from=pruner-discord-bot /pruned/json/ .
COPY --from=pruner-discord-bot /usr/src/app/patches ./patches
COPY --from=pruner-discord-bot /pruned/full/ .
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production
COPY --from=build-discord-bot /usr/src/app/apps/discord-bot/dist ./apps/discord-bot/dist

FROM build-base AS pruner-gateway
COPY . .
RUN bunx turbo prune @lootlog/gateway --docker --out-dir /pruned

FROM build-base AS build-gateway
COPY --from=pruner-gateway /pruned/json/ .
COPY --from=pruner-gateway /usr/src/app/patches ./patches
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY --from=pruner-gateway /pruned/full/ .
RUN bunx turbo run build --filter=@lootlog/gateway

FROM build-base AS production-gateway
COPY --from=pruner-gateway /pruned/json/ .
COPY --from=pruner-gateway /usr/src/app/patches ./patches
COPY --from=pruner-gateway /pruned/full/ .
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production
COPY --from=build-gateway /usr/src/app/apps/gateway/dist ./apps/gateway/dist

FROM build-base AS pruner-battlelog-service
COPY . .
RUN bunx turbo prune @lootlog/battlelog --docker --out-dir /pruned

FROM build-base AS build-battlelog-service
COPY --from=pruner-battlelog-service /pruned/json/ .
COPY --from=pruner-battlelog-service /usr/src/app/patches ./patches
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY --from=pruner-battlelog-service /pruned/full/ .
RUN bunx turbo run build --filter=@lootlog/battlelog

FROM build-base AS production-battlelog-service
COPY --from=pruner-battlelog-service /pruned/json/ .
COPY --from=pruner-battlelog-service /usr/src/app/patches ./patches
COPY --from=pruner-battlelog-service /pruned/full/ .
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production
COPY --from=build-battlelog-service /usr/src/app/apps/battlelog/dist ./apps/battlelog/dist

FROM build-base AS pruner-activity
COPY . .
RUN bunx turbo prune @lootlog/activity --docker --out-dir /pruned

FROM build-base AS build-activity
COPY --from=pruner-activity /pruned/json/ .
COPY --from=pruner-activity /usr/src/app/patches ./patches
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY --from=pruner-activity /pruned/full/ .
RUN bunx turbo run build --filter=@lootlog/activity

FROM build-base AS production-activity
COPY --from=pruner-activity /pruned/json/ .
COPY --from=pruner-activity /usr/src/app/patches ./patches
COPY --from=pruner-activity /pruned/full/ .
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production
COPY --from=build-activity /usr/src/app/apps/activity/dist ./apps/activity/dist

FROM build-base AS pruner-developer
COPY . .
RUN bunx turbo prune @lootlog/developer --docker --out-dir /pruned

FROM build-base AS build-developer
COPY --from=pruner-developer /pruned/json/ .
COPY --from=pruner-developer /usr/src/app/patches ./patches
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY --from=pruner-developer /pruned/full/ .
RUN bunx turbo run build --filter=@lootlog/developer

FROM build-base AS production-developer
COPY --from=pruner-developer /pruned/json/ .
COPY --from=pruner-developer /usr/src/app/patches ./patches
COPY --from=pruner-developer /pruned/full/ .
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production
COPY --from=build-developer /usr/src/app/apps/developer/dist ./apps/developer/dist

FROM runtime-base AS auth

LABEL org.opencontainers.image.title="Lootlog Auth Service"
LABEL org.opencontainers.image.description="Authentication service with Discord OAuth and JWT"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=production-auth --chown=bun:bun /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/auth
USER bun
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e 'const response = await fetch("http://127.0.0.1:4000/healthz"); if (!response.ok) process.exit(1)'
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "--enable-source-maps", "dist/src/main.js"]

FROM runtime-base AS search

LABEL org.opencontainers.image.title="Lootlog Search Service"
LABEL org.opencontainers.image.description="Meilisearch indexing service"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=production-search --chown=bun:bun /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/search
USER bun
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e 'const response = await fetch("http://127.0.0.1:4000/healthz"); if (!response.ok) process.exit(1)'
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "--enable-source-maps", "dist/src/main.js"]

FROM runtime-base AS api

LABEL org.opencontainers.image.title="Lootlog API Service"
LABEL org.opencontainers.image.description="Main API service for organizations, loot, timers, and NPCs"
LABEL org.opencontainers.image.vendor="Lootlog"

ARG GITHUB_SHA
ENV COMMIT_SHA=${GITHUB_SHA}

COPY --from=production-api --chown=bun:bun /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/api
USER bun
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e 'const response = await fetch("http://127.0.0.1:4000/healthz"); if (!response.ok) process.exit(1)'
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "--enable-source-maps", "--preload", "./dist/src/instrumentation.js", "dist/src/main.js"]

FROM runtime-base AS discord-bot

LABEL org.opencontainers.image.title="Lootlog Discord Bot"
LABEL org.opencontainers.image.description="Discord bot for organization notifications and commands"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=production-discord-bot --chown=bun:bun /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/discord-bot
USER bun
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e 'const response = await fetch("http://127.0.0.1:4000/healthz"); if (!response.ok) process.exit(1)'
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "--enable-source-maps", "dist/src/main.js"]

FROM runtime-base AS gateway

LABEL org.opencontainers.image.title="Lootlog Gateway Service"
LABEL org.opencontainers.image.description="Versioned WebSocket gateway for realtime events"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=production-gateway --chown=bun:bun /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/gateway
USER bun
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e 'const response = await fetch("http://127.0.0.1:4000/healthz"); if (!response.ok) process.exit(1)'
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "--enable-source-maps", "dist/src/main.js"]

FROM runtime-base AS battlelog-service

LABEL org.opencontainers.image.title="Lootlog Battlelog Service"
LABEL org.opencontainers.image.description="Battle statistics and warrior tracking service"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=production-battlelog-service --chown=bun:bun /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/battlelog
USER bun
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e 'const response = await fetch("http://127.0.0.1:4000/healthz"); if (!response.ok) process.exit(1)'
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "--enable-source-maps", "dist/src/main.js"]

FROM runtime-base AS activity

LABEL org.opencontainers.image.title="Lootlog Activity Service"
LABEL org.opencontainers.image.description="Activity and audit service with TimescaleDB"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=production-activity --chown=bun:bun /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/activity
USER bun
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e 'const response = await fetch("http://127.0.0.1:4000/healthz"); if (!response.ok) process.exit(1)'
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-lc", "APP_VERSION=$(bun -e 'console.log(require(\"./package.json\").version)') bun --enable-source-maps dist/src/main.js"]

FROM runtime-base AS developer

LABEL org.opencontainers.image.title="Lootlog Developer Portal"
LABEL org.opencontainers.image.description="Developer documentation portal with SSR"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=production-developer --chown=bun:bun /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/developer
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e 'const response = await fetch("http://127.0.0.1:3000/"); if (!response.ok) process.exit(1)'
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "server.js"]
