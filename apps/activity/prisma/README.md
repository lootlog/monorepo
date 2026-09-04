# Archived Prisma migrations

These migrations are retained as the immutable deployment history used to establish the Drizzle adoption fingerprint. Prisma must not execute them after the rewrite. New databases use `drizzle/migrations/0000_activity_legacy_baseline.sql`.

Maintain the current schema directly in `src/database/schema.ts`. Run
`bun run db:generate` to derive reviewed SQL migrations and Drizzle snapshot
metadata from that source; this archive is not a code generation input.
