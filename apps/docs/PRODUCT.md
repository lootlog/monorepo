# Documentation product context

Read the canonical [`PRODUCT.md`](../../PRODUCT.md) first.

The docs app is the supported Polish user guide. It explains current behavior,
installation, access, recovery, and observable success. It must not present a
target contract from `ARCHITECTURE.md` as implemented before the product ships
and verifies it. Follow the Read mode in `DESIGN.md`.

The app uses TanStack Start with the Fumadocs Vite integration. Every guide,
the root redirect, and the search index are prerendered into `dist/client`; the
deployed Assets Worker does not execute server functions at runtime.

Merges to `main` deploy the affected Docs artifact to the isolated
`lootlog-docs-develop` Worker. Production continues to use `lootlog-docs` and
requires the release workflow's `prod` environment approval.
