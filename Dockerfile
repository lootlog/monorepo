# syntax=docker/dockerfile:1.7

FROM node:26.8.1-alpine3.24 AS runtime-base

RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init fontconfig ttf-dejavu && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

FROM node:26.8.1-alpine3.24 AS build-base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV TURBO_TELEMETRY_DISABLED="1"

RUN npm install -g pnpm@12.1.0 turbo@2.9.18

COPY tools/release/prune-production-deploy.mjs /usr/local/lib/prune-production-deploy.mjs

WORKDIR /usr/src/app

# Each service is pruned and built independently so target builds do not
# install or compile the entire monorepo.

FROM build-base AS pruner-api
COPY . .
RUN turbo prune @lootlog/api --docker --out-dir /pruned

FROM build-base AS build-api
COPY --from=pruner-api /pruned/json/ .
COPY --from=pruner-api /usr/src/app/patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline
COPY --from=pruner-api /pruned/full/ .
COPY --from=pruner-api /usr/src/app/tools/clean-swagger-metadata.mjs ./tools/clean-swagger-metadata.mjs
RUN pnpm exec turbo run build --filter=@lootlog/api
RUN pnpm deploy --filter=@lootlog/api --prod /prod/api && \
    node /usr/local/lib/prune-production-deploy.mjs /prod/api
RUN node -e 'require("/prod/api/dist/src/prisma/db.js")'

FROM build-base AS pruner-auth
COPY . .
RUN turbo prune @lootlog/auth --docker --out-dir /pruned

FROM build-base AS build-auth
COPY --from=pruner-auth /pruned/json/ .
COPY --from=pruner-auth /usr/src/app/patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline
COPY --from=pruner-auth /pruned/full/ .
RUN pnpm exec turbo run build --filter=@lootlog/auth
RUN pnpm deploy --filter=@lootlog/auth --prod /prod/auth && \
    node /usr/local/lib/prune-production-deploy.mjs /prod/auth

FROM build-base AS pruner-search
COPY . .
RUN turbo prune @lootlog/search --docker --out-dir /pruned

FROM build-base AS build-search
COPY --from=pruner-search /pruned/json/ .
COPY --from=pruner-search /usr/src/app/patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline
COPY --from=pruner-search /pruned/full/ .
COPY --from=pruner-search /usr/src/app/tools/clean-swagger-metadata.mjs ./tools/clean-swagger-metadata.mjs
RUN pnpm exec turbo run build --filter=@lootlog/search
RUN pnpm deploy --filter=@lootlog/search --prod /prod/search && \
    node /usr/local/lib/prune-production-deploy.mjs /prod/search

FROM build-base AS pruner-discord-bot
COPY . .
RUN turbo prune @lootlog/discord-bot --docker --out-dir /pruned

FROM build-base AS build-discord-bot
COPY --from=pruner-discord-bot /pruned/json/ .
COPY --from=pruner-discord-bot /usr/src/app/patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline
COPY --from=pruner-discord-bot /pruned/full/ .
RUN pnpm exec turbo run build --filter=@lootlog/discord-bot
RUN pnpm deploy --filter=@lootlog/discord-bot --prod /prod/discord-bot && \
    node /usr/local/lib/prune-production-deploy.mjs /prod/discord-bot

FROM build-base AS pruner-gateway
COPY . .
RUN turbo prune @lootlog/gateway --docker --out-dir /pruned

FROM build-base AS build-gateway
COPY --from=pruner-gateway /pruned/json/ .
COPY --from=pruner-gateway /usr/src/app/patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline
COPY --from=pruner-gateway /pruned/full/ .
RUN pnpm exec turbo run build --filter=@lootlog/gateway
RUN pnpm deploy --filter=@lootlog/gateway --prod /prod/gateway && \
    node /usr/local/lib/prune-production-deploy.mjs /prod/gateway

FROM build-base AS pruner-battlelog-service
COPY . .
RUN turbo prune @lootlog/battlelog-service --docker --out-dir /pruned

FROM build-base AS build-battlelog-service
COPY --from=pruner-battlelog-service /pruned/json/ .
COPY --from=pruner-battlelog-service /usr/src/app/patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline
COPY --from=pruner-battlelog-service /pruned/full/ .
RUN pnpm exec turbo run build --filter=@lootlog/battlelog-service
RUN pnpm deploy --filter=@lootlog/battlelog-service --prod /prod/battlelog-service && \
    node /usr/local/lib/prune-production-deploy.mjs /prod/battlelog-service

FROM build-base AS pruner-activity
COPY . .
RUN turbo prune @lootlog/activity --docker --out-dir /pruned

FROM build-base AS build-activity
COPY --from=pruner-activity /pruned/json/ .
COPY --from=pruner-activity /usr/src/app/patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline
COPY --from=pruner-activity /pruned/full/ .
RUN pnpm exec turbo run build --filter=@lootlog/activity
RUN pnpm deploy --filter=@lootlog/activity --prod /prod/activity && \
    node /usr/local/lib/prune-production-deploy.mjs /prod/activity
RUN node -e 'require("/prod/activity/dist/src/prisma/db.js")'

FROM build-base AS pruner-developer
COPY . .
RUN turbo prune @lootlog/developer --docker --out-dir /pruned

FROM build-base AS build-developer
COPY --from=pruner-developer /pruned/json/ .
COPY --from=pruner-developer /usr/src/app/patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline
COPY --from=pruner-developer /pruned/full/ .
RUN pnpm exec turbo run build --filter=@lootlog/developer
RUN pnpm deploy --filter=@lootlog/developer --prod /prod/developer && \
    node /usr/local/lib/prune-production-deploy.mjs /prod/developer

FROM runtime-base AS auth

LABEL org.opencontainers.image.title="Lootlog Auth Service"
LABEL org.opencontainers.image.description="Authentication service with Discord OAuth and JWT"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build-auth --chown=nodejs:nodejs --chmod=755 /prod/auth /prod/auth
WORKDIR /prod/auth

USER nodejs

EXPOSE 4000

ENV NODE_OPTIONS="--no-strip-types"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "--import", "./dist/src/instrumentation.js", "dist/src/main.js"]

FROM runtime-base AS search

LABEL org.opencontainers.image.title="Lootlog Search Service"
LABEL org.opencontainers.image.description="Meilisearch indexing service"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build-search --chown=nodejs:nodejs --chmod=755 /prod/search /prod/search
WORKDIR /prod/search

USER nodejs

EXPOSE 4000

ENV NODE_OPTIONS="--no-strip-types"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "--import", "./dist/src/instrumentation.js", "dist/src/main.js"]

FROM runtime-base AS api

LABEL org.opencontainers.image.title="Lootlog API Service"
LABEL org.opencontainers.image.description="Main API service for guilds, loots, timers, and NPCs"
LABEL org.opencontainers.image.vendor="Lootlog"

ARG GITHUB_SHA
ENV COMMIT_SHA=${GITHUB_SHA}

COPY --from=build-api --chown=nodejs:nodejs --chmod=755 /prod/api /prod/api
WORKDIR /prod/api

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "--import", "./dist/src/instrumentation.js", "dist/src/main.js"]

FROM runtime-base AS discord-bot

LABEL org.opencontainers.image.title="Lootlog Discord Bot"
LABEL org.opencontainers.image.description="Discord bot for guild notifications and commands"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build-discord-bot --chown=nodejs:nodejs --chmod=755 /prod/discord-bot /prod/discord-bot
WORKDIR /prod/discord-bot

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "--import", "./dist/src/instrumentation.js", "dist/src/main.js"]

FROM runtime-base AS gateway

LABEL org.opencontainers.image.title="Lootlog Gateway Service"
LABEL org.opencontainers.image.description="Socket.IO gateway for real-time events"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build-gateway --chown=nodejs:nodejs --chmod=755 /prod/gateway /prod/gateway
WORKDIR /prod/gateway

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "--import", "./dist/src/instrumentation.js", "dist/src/main.js"]

FROM runtime-base AS battlelog-service

LABEL org.opencontainers.image.title="Lootlog Battlelog Service"
LABEL org.opencontainers.image.description="Battle statistics and warrior tracking service"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build-battlelog-service --chown=nodejs:nodejs --chmod=755 /prod/battlelog-service /prod/battlelog-service
WORKDIR /prod/battlelog-service

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "--import", "./dist/src/instrumentation.js", "dist/src/main.js"]

FROM runtime-base AS activity

LABEL org.opencontainers.image.title="Lootlog Activity Service"
LABEL org.opencontainers.image.description="Activity and event logging service with TimescaleDB"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build-activity --chown=nodejs:nodejs --chmod=755 /prod/activity /prod/activity
WORKDIR /prod/activity

USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-lc", "APP_VERSION=$(node -p \"require('./package.json').version\") node --import ./dist/src/instrumentation.js dist/src/main.js"]

FROM runtime-base AS developer

LABEL org.opencontainers.image.title="Lootlog Developer Portal"
LABEL org.opencontainers.image.description="Developer documentation portal with SSR"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build-developer --chown=nodejs:nodejs --chmod=755 /prod/developer /prod/developer
WORKDIR /prod/developer

USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]
