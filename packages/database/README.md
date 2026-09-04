# PostgreSQL infrastructure

`makePostgresLayer` owns one `pg.Pool` and exposes `PgClient`, `SqlClient`, and
`PostgresPool`. Each service creates its own layer using its database URL and
application name. Pool size, TLS, timeouts, and connection lifetime use the
`PgClient.PgPoolConfig` contract and the installed driver's defaults, except that
connection acquisition defaults to five seconds rather than waiting indefinitely.
The startup probe uses the same timeout. This also bounds pending connections
when startup fails; override `connectTimeout` for a different deployment budget.

Application queries use Drizzle's `effect-postgres` adapter. Better Auth's
`node-postgres` adapter borrows `PostgresPool`; it must not create or close a
second pool. Disposing the application runtime closes the shared pool, including
when the startup connectivity check fails.

Sharing a pool does not share an active transaction between adapters. Keep each
transaction entirely within its owning adapter; never call Better Auth inside
an Effect transaction expecting it to join that transaction.

Run `bun run test`, `bun run typecheck`, and `bun run lint`. With Docker available,
`bun run test:integration` checks both Drizzle adapters against PostgreSQL,
including shared connections, date/JSON/numeric codecs, commit, rollback, and
pool shutdown.
