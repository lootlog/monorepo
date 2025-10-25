FROM node:25-alpine3.22 AS base

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

FROM base AS build
WORKDIR /usr/src/app

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

RUN pnpm deploy --filter=@lootlog/api --prod /prod/api && \
    pnpm deploy --filter=@lootlog/auth --prod /prod/auth && \
    pnpm deploy --filter=@lootlog/search --prod /prod/search && \
    pnpm deploy --filter=@lootlog/discord-bot --prod /prod/discord-bot && \
    pnpm deploy --filter=@lootlog/gateway --prod /prod/gateway && \
    pnpm deploy --filter=@lootlog/battlelog-service --prod /prod/battlelog-service

RUN chown -R nodejs:nodejs /prod

FROM base AS auth

LABEL org.opencontainers.image.title="Lootlog Auth Service"
LABEL org.opencontainers.image.description="Authentication service with Discord OAuth and JWT"
LABEL org.opencontainers.image.vendor="Lootlog"

COPY --from=build --chown=nodejs:nodejs --chmod=755 /prod/auth /prod/auth
WORKDIR /prod/auth

USER nodejs

EXPOSE 4000

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