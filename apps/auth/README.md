# Auth source contracts

## Internal service credentials

`POST /auth/idp-token` requires `Authorization: Bearer <AUTH_IDP_TOKEN_SECRET>`.
Configure the same nonempty secret in Auth and API. The credential authorizes
the API to retrieve Discord OAuth tokens; do not share it with browser clients,
Gateway, or the API-key status service. Tokens are returned with `Cache-Control:
no-store`. Sessions, user JWTs, and forwarded identity headers cannot authorize
this endpoint.

The account-deletion workflow separately requires `BATTLELOG_CLEANUP_SECRET`
in API and Battlelog for `POST /internal/delete-user-data`. Both endpoints reject
requests when their credential is absent or empty. Keep these routes private at
the ingress as well; network isolation does not replace the service check.

For rollout, provision two distinct random secrets in the appropriate services,
deploy API callers that send them, then deploy the guarded Auth and Battlelog
endpoints. Until all services agree, Discord token retrieval or account deletion
fails closed. Do not roll back to unguarded endpoint implementations. Rotate a
credential with a coordinated caller/receiver deployment. No data migration is
required. Local `bun run env:generate` shares generated values across the root
and relevant application environment files.

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
`bun run db:migrate:dev` or `bun run db:migrate:deploy`. Existing adoption and
upgrade decisions remain part of that workflow. Run `bun run test:integration`
to verify migrations against disposable PostgreSQL.

TypeScript source is edited directly. Better Auth CLI generation and database
introspection must not overwrite the application's schema.

## Local developer portal

The local portal at `http://localhost/developer/keys` requires
`API_KEYS_ENABLED=true` in `apps/auth/.env`. Set `API_URL=http://localhost:4003`
so auth can check the selected Organizations against the local API. Reload the
running auth service after changing these values. The application default remains
disabled; other environments must explicitly enable API keys during rollout.

Local Traefik must forward `X-Api-Key` to auth and copy the returned
`X-Auth-Api-Key-Access` alongside the user identity. Strip client-supplied identity
and access headers before forward authentication.
