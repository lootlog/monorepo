FROM node:22-alpine3.22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@9.1.1 --activate

FROM base AS build
COPY . /usr/src/app
RUN ls
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build --filter=!@lootlog/landing --filter=!@lootlog/web --filter=!@lootlog/game-client

RUN pnpm deploy --filter=@lootlog/api --prod /prod/api
RUN pnpm deploy --filter=@lootlog/auth --prod /prod/auth
RUN pnpm deploy --filter=@lootlog/search --prod /prod/search
RUN pnpm deploy --filter=@lootlog/discord-bot --prod /prod/discord-bot
RUN pnpm deploy --filter=@lootlog/gateway --prod /prod/gateway

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