# Development traffic splitter

This Cloudflare Worker owns `dev.lootlog.pl` and routes requests to the
development Landing, Docs, and Web origins. Generated asset namespaces are
explicit:

| Paths                                                         | Origin                         |
| ------------------------------------------------------------- | ------------------------------ |
| `/`, legal pages, `/landing-assets`, `/brand`, `/screenshots` | Landing Pages preview          |
| `/docs`, `/docs-assets`, `/__tsr`, `/api/search`              | Docs development Assets Worker |
| `/__legacy-assets/{landing,docs}/assets`                      | Tagged legacy asset origin     |
| `/assets` and every remaining application route               | Web Pages preview              |

Legacy `/assets` requests selected from a Landing or Docs document are
temporarily redirected into an origin-tagged, non-cacheable namespace. When a
cached untagged parent asset requests a child, the Worker identifies the parent
with HEAD requests to the three fixed origins before applying the same tag.
This keeps pre-migration HTML and nested assets usable during a deployment
without sharing mutable browser state. Cookies and authorization headers are
removed before forwarding or probing.

## Commands

```bash
pnpm --filter @lootlog/traffic-splitter test
pnpm --filter @lootlog/traffic-splitter typecheck
pnpm --filter @lootlog/traffic-splitter lint
pnpm --filter @lootlog/traffic-splitter build
```

Merges to `main` deploy the Worker through the GitHub `dev` environment. Set
`CLOUDFLARE_WORKERS_API_TOKEN` there from Cloudflare's **Edit Cloudflare
Workers** token template, scoped to the Lootlog account and `lootlog.pl` zone.
The existing Pages-only `CLOUDFLARE_API_TOKEN` is intentionally not reused.
