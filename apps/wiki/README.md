# Lootlog Wiki

Public wiki application for Lootlog search data. The app is built with TanStack Start, Vite, React, and Tailwind CSS, and is deployed as a Cloudflare Worker.

## Features

- Item, NPC, and player search backed by the Search API.
- Static public routes with a shared header, footer, and theme toggle.
- Runtime Search API configuration through `VITE_SEARCH_API_URL`.

## Environment

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required variable:

```bash
VITE_SEARCH_API_URL=https://search.lootlog.pl
```

Cloudflare credentials and deployment settings are managed by Cloudflare Workers Builds.

## Development

Run commands from the repository root with a package filter:

```bash
pnpm --filter @lootlog/wiki dev
pnpm --filter @lootlog/wiki build
pnpm --filter @lootlog/wiki test
pnpm --filter @lootlog/wiki lint
```

The app uses file-based TanStack Router routes under `src/routes`.

## Deployment

Deployments are handled by Cloudflare Workers Builds. The Wrangler config maps:

- the production branch `main` to `wiki.lootlog.pl`
- `develop` to `dev-wiki.lootlog.pl`

Cloudflare should use `main` as the production branch and enable non-production branch builds for
`develop`. The production build uses the top-level Wrangler environment; the develop build uses
the `develop` Wrangler environment.

Use `apps/wiki` as the Workers Builds root directory. TanStack Start emits the deployable Worker
entrypoint during `pnpm run build`, so Wrangler must deploy the built server artifact while still
reading environment-specific settings from `wrangler.jsonc`.

Production build settings:

```bash
Build command: pnpm run build
Deploy command: npx wrangler deploy dist/server/index.js --config wrangler.jsonc --env="" --assets dist/client --no-bundle
Version command: npx wrangler versions upload dist/server/index.js --config wrangler.jsonc --env="" --assets dist/client --no-bundle
```

Develop build settings:

```bash
Build command: pnpm run build
Deploy command: npx wrangler deploy dist/server/index.js --config wrangler.jsonc --env develop --assets dist/client --no-bundle
Version command: npx wrangler versions upload dist/server/index.js --config wrangler.jsonc --env develop --assets dist/client --no-bundle
```

If Cloudflare binding types need to be refreshed, run:

```bash
pnpm --filter @lootlog/wiki cf-typegen
```
