# Dependency graph parity

## Migration check

The pnpm lockfile was imported by Bun 1.4.0 before the legacy pnpm files were removed.
The comparison normalized pnpm snapshot keys by removing peer-context suffixes and
compared them with the resolved package identities in `bun.lock`.

- pnpm resolved package identities: 2,053
- Bun resolved external package identities inherited from pnpm: 2,053
- pnpm identities missing from Bun: 0
- new Bun identities required by the rewrite foundation: 5

The five additions are `@types/bun@1.4.0`, `bun-types@1.4.0`,
`effect@4.0.0-rc.112`, `fast-check@4.9.0`, and `pure-rand@8.4.2`.
The latter two are transitive dependencies of Effect and its schema tests.

Workspace links were excluded from the external-package comparison. The rewrite
introduced `schema`, `domain`, `protocol`, and `messaging`, removed obsolete
workspaces, and the current Turbo graph contains 25 `apps/*` and `packages/*`
workspaces. The 34-workspace figure recorded during migration was an intermediate
state, not the final graph.

## Install verification

`bun install --frozen-lockfile` completed without lockfile changes after the
rewrite cleanup. The final graph reports 1,279 installs across 1,574 package
records with the isolated linker.
