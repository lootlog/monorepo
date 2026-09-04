# syntax=docker/dockerfile:1.7

FROM oven/bun:1.4.1-alpine@sha256:2ef545220f7a886f22fcb3f2309bbd6bcf1c0aa04b7d79c31765c7aa4a13aac1 AS build-base

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

RUN bunx turbo run build --filter="${PACKAGE}"

FROM build-base AS production

ARG APP_DIR

COPY --from=pruner /pruned/json/ .
COPY --from=pruner /usr/src/app/patches ./patches

RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --production

COPY --from=pruner /pruned/full/ .
COPY --from=builder "/usr/src/app/${APP_DIR}/dist" "/usr/src/app/${APP_DIR}/dist"

FROM oven/bun:1.4.1-alpine@sha256:2ef545220f7a886f22fcb3f2309bbd6bcf1c0aa04b7d79c31765c7aa4a13aac1 AS runtime

ARG APP_DIR
ARG GITHUB_SHA
ARG INSTALL_FONTS=0

RUN apk add --no-cache --upgrade dumb-init libcrypto3 libssl3 && \
    case "${INSTALL_FONTS}" in \
      0) ;; \
      1) apk add --no-cache fontconfig ttf-dejavu ;; \
      *) echo "INSTALL_FONTS must be 0 or 1" >&2; exit 1 ;; \
    esac

ENV NODE_ENV=production
ENV COMMIT_SHA=${GITHUB_SHA}

WORKDIR /usr/src/app

COPY --from=production --chown=bun:bun /usr/src/app /usr/src/app

WORKDIR "/usr/src/app/${APP_DIR}"

USER bun
EXPOSE 4000
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "--enable-source-maps", "dist/src/main.js"]
