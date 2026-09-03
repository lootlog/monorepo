# @lootlog/landing

Static TanStack Start product site for Lootlog.

## Responsibilities

- Product introduction and installation paths.
- Links to the authenticated app, user documentation, GitHub, Discord, and
  support.
- Privacy policy and terms of service.
- Approved product screenshots and evidence-backed public claims.

User documentation lives in `apps/docs` and is published separately at
`docs.lootlog.pl`. Read `PRODUCT.md` in this directory before changing landing
copy.

## Development

Run commands from the monorepo root:

```bash
bun run --filter=@lootlog/landing dev
```

The development server uses port `3003`.

## Checks

```bash
bun run --filter=@lootlog/landing build
bun run --filter=@lootlog/landing lint
bun run --filter=@lootlog/landing typecheck
bun run --filter=@lootlog/landing test
```

The app prerenders its public routes to `dist/client` for Cloudflare Pages.
Merges deploy affected development targets. Production deploys select an
immutable commit in the Release workflow.
