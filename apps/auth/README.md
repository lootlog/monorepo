# Auth source contracts

## Internal service communication

Synchronous service-to-service operations (`getIdpToken`, `listPlatformRoleHolders`,
`getApiKeyStatuses`, and the admin panel's operator procedures) are served over
Effect RPC (`@lootlog/rpc/auth`) on the
internal port `RPC_PORT` (default `PORT + 100`, path `/rpc`). No Traefik
`IngressRoute` targets that port and its procedures are excluded from
`openapi.yaml`. Each procedure lists the services allowed to call it; a caller
proves its identity with the bearer token of its own edge, such as
`RPC_TOKEN_API_TO_AUTH`. See "Internal RPC" in `docs/operations.md`.

`GET /auth/verify` remains on the public HTTP port for Traefik `forward-auth`.

## Source maintenance

Maintain HTTP schemas and endpoints in `src/http-api/contracts` and compose them
in `src/http-api/auth-api.ts`. Run `bun run openapi:generate` to export
`openapi.yaml` after changing a contract.

Maintain database tables in `src/database/drizzle.schema.ts`. When changing
Better Auth options or plugins in `src/auth/provider/better-auth.ts`, review the
plugin's persistence requirements and update the schema and adapter mapping in
`src/database/drizzle.ts` together. Preserve existing table names, indexes,
timestamps, and application fields unless a reviewed migration changes them.

Run `bun run db:generate` to produce SQL and Drizzle snapshot metadata from the
maintained source. Review both artifacts before applying migrations through
`bun run db:migrate:dev` or `bun run db:migrate:deploy`. Existing databases must have an intact Drizzle migration journal; legacy schema
adoption is no longer supported. Empty databases are created from the committed SQL
migrations. Run `bun run test:integration`
to verify database adapters and authentication storage against disposable services.

TypeScript source is edited directly. Better Auth CLI generation and database
introspection must not overwrite the application's schema.

## Better Auth 1.7.5 rollout

Before deploying Auth 1.7.5, run `bun run auth:migrate:plan` and
`bun run db:migrate:deploy`. Migration
`20260919081743_restore-provider-account-identity` makes `account.issuer`
nullable and replaces its compound index with a unique index on
`providerId, accountId`. Existing issuer values and account identities remain
intact. Better Auth 1.7.3 and later no longer write issuer; deploying the new
application before this migration would reject new Discord accounts.

The preflight verifies the committed migration journal and checks Discord-only identities
and duplicate provider/account keys before writing. After applying, verify that
the plan is `up-to-date`, then deploy and check Discord sign-in, existing
sessions, and account linking. Do not restore the issuer `NOT NULL` constraint
on rollback: accounts created after migration may have a null issuer. A return
to pre-1.7.3 Auth requires maintenance, a reviewed Discord issuer backfill, and
verification of the earlier schema contract before restoring the old application.

Effect SQL now uses its native PostgreSQL driver. Better Auth retains a separate
scoped node-postgres pool for its Promise-based Drizzle adapter. Auth divides
its connection ceiling between the two pools (default: five each, ten total);
other services use only the native pool. Cross-adapter writes become visible
on commit, and each adapter preserves transaction rollback and isolation.

## Local developer portal

The local portal at `http://localhost/developer/keys` requires
`API_KEYS_ENABLED=true` in `apps/auth/.env`. Set `API_URL=http://localhost:4003`
so auth can check the selected Organizations against the local API. Reload the
running auth service after changing these values. The application default remains
disabled; other environments must explicitly enable API keys during rollout.

Local Traefik must forward `X-Api-Key` to auth and copy the returned
`X-Auth-Api-Key-Access` alongside the user identity. Strip client-supplied identity
and access headers before forward authentication.
