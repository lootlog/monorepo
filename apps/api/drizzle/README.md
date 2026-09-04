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
