# Auth source contracts

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
