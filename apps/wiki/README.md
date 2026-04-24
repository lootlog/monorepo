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

Cloudflare deployment also defines `VITE_SEARCH_API_URL` in `wrangler.jsonc`.
Cloudflare credentials are not stored in the repository; authenticate Wrangler locally or provide
the required Cloudflare environment variables in CI before deploying.

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

Deploy to Cloudflare Workers with:

```bash
pnpm --filter @lootlog/wiki deploy
```

The deploy script builds the TanStack Start Worker and then runs `wrangler deploy` using
`apps/wiki/wrangler.jsonc`.

If Cloudflare binding types need to be refreshed, run:

```bash
pnpm --filter @lootlog/wiki cf-typegen
```
