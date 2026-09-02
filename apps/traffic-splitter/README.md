# Traffic splitter

This package is the source of truth for two independently deployed Cloudflare
Workers:

- `lootlog-traffic-splitter-dev` owns `dev.lootlog.pl` and uses development
  origins;
- `lootlog-route-splitter` owns `lootlog.pl` and uses production origins.

Both Workers use the same route table. Their generated asset namespaces are
explicit:

| Paths                                                                   | Origin                     |
| ----------------------------------------------------------------------- | -------------------------- |
| `/`, legal pages, `/_next`, `/landing-assets`, `/brand`, `/screenshots` | Landing                    |
| `/docs`, `/docs-assets`, `/__tsr`, `/api/search`                        | Docs                       |
| `/__legacy-assets/{landing,docs}/assets`                                | Tagged legacy asset origin |
| `/assets` and every remaining application route                         | Web                        |

Legacy `/assets` requests selected from a Landing or Docs document are
temporarily redirected into an origin-tagged, non-cacheable namespace. When a
cached untagged parent asset requests a child, the Worker identifies the parent
with HEAD requests to the three fixed origins before applying the same tag.
This keeps pre-migration HTML and nested assets usable during a deployment
without sharing mutable browser state. Cookies and authorization headers are
removed before forwarding or probing.

## Commands

```bash
bun run --filter=@lootlog/traffic-splitter test
bun run --filter=@lootlog/traffic-splitter typecheck
bun run --filter=@lootlog/traffic-splitter lint
bun run --filter=@lootlog/traffic-splitter build
```

The `dev` command and merges to `main` target only the Wrangler `develop`
environment and therefore cannot overwrite the production Worker. The GitHub
`dev` environment uses `CLOUDFLARE_WORKERS_API_TOKEN`, scoped to the Lootlog
account and `lootlog.pl` zone. The existing Pages-only
`CLOUDFLARE_API_TOKEN` is intentionally not reused.

Production is the top-level Wrangler environment. It is deployed only by the
approved release workflow from its checksummed artifact. During a coordinated
release, the compatible splitter is promoted before Landing and Docs. Public
smoke checks then fetch the generated CSS and JavaScript through their real
domains. A failed deployment or smoke check rolls applications back first and
the splitter last.
