FROM node:22-alpine3.22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

FROM base AS build
WORKDIR /usr/src/app

# Copy workspace configuration and all package.json files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/

# Remove source files but keep package.json files for dependency installation
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

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile --prefer-offline

# Copy source code after dependencies are installed
COPY . .

# Build the projects
RUN pnpm run build --filter=!@lootlog/landing --filter=!@lootlog/web --filter=!@lootlog/game-client

# Deploy all services in a single layer
RUN pnpm deploy --filter=@lootlog/api --prod /prod/api && \
    pnpm deploy --filter=@lootlog/auth --prod /prod/auth && \
    pnpm deploy --filter=@lootlog/search --prod /prod/search && \
    pnpm deploy --filter=@lootlog/discord-bot --prod /prod/discord-bot && \
    pnpm deploy --filter=@lootlog/gateway --prod /prod/gateway

FROM base AS auth
COPY --from=build /prod/auth /prod/auth
WORKDIR /prod/auth
EXPOSE 4000
CMD [ "pnpm", "start" ]

FROM base AS search
COPY --from=build /prod/search /prod/search
WORKDIR /prod/search
EXPOSE 4000
CMD [ "pnpm", "start" ]

FROM base AS api
COPY --from=build /prod/api /prod/api
WORKDIR /prod/api
EXPOSE 4000
CMD [ "pnpm", "start" ]

FROM base AS discord-bot
COPY --from=build /prod/discord-bot /prod/discord-bot
WORKDIR /prod/discord-bot
EXPOSE 4000
CMD [ "pnpm", "start" ]

FROM base AS gateway
COPY --from=build /prod/gateway /prod/gateway
WORKDIR /prod/gateway
EXPOSE 4000
CMD [ "pnpm", "start" ]