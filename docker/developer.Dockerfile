# syntax=docker/dockerfile:1.7

FROM oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f AS build-base

ENV HUSKY=0
ENV TURBO_TELEMETRY_DISABLED=1

WORKDIR /usr/src/app

FROM build-base AS pruner

ARG PACKAGE

COPY . .

RUN test -n "${PACKAGE}" && \
    bunx turbo prune "${PACKAGE}" --docker --out-dir=/pruned

FROM build-base AS builder

ARG PACKAGE

COPY --from=pruner /pruned/json/ .
COPY --from=pruner /usr/src/app/patches ./patches

RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile

COPY --from=pruner /pruned/full/ .
COPY --from=pruner /usr/src/app/packages/tsconfig.public-api.json ./packages/tsconfig.public-api.json

RUN bunx turbo run build --filter="${PACKAGE}"

FROM build-base AS production

ARG APP_DIR

COPY --from=pruner /pruned/json/ .
COPY --from=pruner /usr/src/app/patches ./patches

RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --production

# TypeScript reaches the production install only as an optional peer of
# runtime dependencies (cva, cosmiconfig). The runtime never runs tsc, and the
# TypeScript 7 Go binary is flagged by Trivy, so drop it from the image.
RUN rm -rf node_modules/typescript node_modules/.bun/typescript@* node_modules/.bun/@typescript+typescript-* && \
    ! find node_modules -type f -path '*@typescript*' -name tsc | grep -q .

COPY --from=pruner /pruned/full/ .
COPY --from=builder "/usr/src/app/${APP_DIR}/dist" "/usr/src/app/${APP_DIR}/dist"

FROM oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f AS runtime

ARG APP_DIR
ARG GITHUB_SHA

RUN apk add --no-cache --upgrade dumb-init libcrypto3 libssl3

ENV NODE_ENV=production
ENV COMMIT_SHA=${GITHUB_SHA}

WORKDIR /usr/src/app

COPY --from=production --chown=bun:bun /usr/src/app /usr/src/app

WORKDIR "/usr/src/app/${APP_DIR}"

USER bun
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "server.js"]
