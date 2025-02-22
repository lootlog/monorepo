FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@9.1.1 --activate

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run generate
RUN pnpm run -r build

RUN pnpm deploy --filter=@lootlog/web --prod /prod/web
RUN pnpm deploy --filter=@lootlog/api --prod /prod/api
RUN pnpm deploy --filter=@lootlog/auth --prod /prod/auth
RUN pnpm deploy --filter=@lootlog/search --prod /prod/search

FROM nginx:1.27.4-alpine AS web

COPY --from=build /prod/web/dist /usr/share/nginx/html
COPY --from=build /prod/web/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
# CMD [ "pnpm", "preview" ]

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
EXPOSE 8001
CMD [ "pnpm", "start" ]