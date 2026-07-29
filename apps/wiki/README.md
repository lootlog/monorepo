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

- the top-level production environment to `wiki.lootlog.pl`
- the `develop` Wrangler environment to `dev-wiki.lootlog.pl`

Both Cloudflare integrations use `main` as their source branch. The production integration uploads
a version without changing traffic; the release workflow deploys that application after `prod`
approval. The `lootlog-wiki-develop` integration deploys the same `main` commit immediately with
the `develop` Wrangler environment.

Use `apps/wiki` as the Workers Builds root directory. TanStack Start emits the deployable Worker
entrypoint during `pnpm run build`, so Wrangler must deploy the built server artifact while still
reading environment-specific settings from `wrangler.jsonc`.

Production build settings:

```bash
Build command: pnpm run build
Deploy command: npx wrangler versions upload dist/server/index.js --config wrangler.jsonc --env="" --assets dist/client
Version command: npx wrangler versions upload dist/server/index.js --config wrangler.jsonc --env="" --assets dist/client
```

Development build settings:

```bash
Build command: pnpm run build
Deploy command: npx wrangler deploy dist/server/index.js --config wrangler.jsonc --env develop --assets dist/client
Version command: npx wrangler versions upload dist/server/index.js --config wrangler.jsonc --env develop --assets dist/client
```

If Cloudflare binding types need to be refreshed, run:

```bash
pnpm --filter @lootlog/wiki cloudflare:typegen
```
