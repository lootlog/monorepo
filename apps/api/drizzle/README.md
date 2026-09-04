# API database migration evidence

`legacy-prisma/` is the immutable archive of the Prisma schema and every Prisma
migration deployed before the Drizzle adoption. It is the only retained Prisma
artifact and exists solely as physical-schema evidence.

Verify the archive from the repository root with:

```sh
shasum -a 256 -c apps/api/drizzle/legacy-prisma.sha256
```

`legacy-prisma-schema.sql` is the deterministic Prisma datamodel DDL generated
with `prisma migrate diff`. It is retained for mechanical comparison.

`migrations/20260901121000_legacy_prisma_baseline/migration.sql` is the Drizzle
baseline for a new empty database. It includes the reservation checks that were
introduced by handwritten Prisma migrations and therefore are absent from the
Prisma datamodel DDL.

An existing database is never marked as adopted merely because tables exist.
The adoption routine compares tables, columns, physical types, nullability,
database defaults, enum labels, index names, and constraint names with the
generated expected catalog. Any missing, additional, or changed catalog object
aborts the transaction before the baseline migration is recorded.

## Durable loot publications

Apply `20260904193330_loot_publication_outbox` before deploying the API that
uses it. Loot acceptance commits the loot, Organization records, submissions,
and publication intents in one transaction. The API process dispatches pending
intents in bounded batches; broker or cache failures retain them for retry after
restart. Request-only test layers do not start this worker.

Delivery is at least once: a process can stop after broker confirmation but
before deleting the intent. The stable `loot-publication:<id>` message identifier
and existing source identifiers must be preserved on replay. Search writes are
upserts; instant notification jobs deduplicate by source event, rule, and target.
Pending notification jobs can be re-enqueued, while terminal jobs stay terminal.

Inspect pending work without exposing event bodies:

```sql
SELECT "id", "lootId", "organizationIds", "createdAt", "lastAttemptAt"
FROM "LootPublicationOutbox"
ORDER BY "createdAt";
```

After repairing the failed dependency, leave pending rows in place; the worker
retries them automatically. An archived/deleted Organization loot record no
longer receives pending metadata. Do not delete the table during rollback:
older API versions do not drain it, so retain a compatible dispatcher until its
backlog is empty. The migration cannot reconstruct publications lost before it
was installed; those require reconciliation from their owning data domains.
