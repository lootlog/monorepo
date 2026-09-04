# Battlelog object cleanup

Apply `20260904192453_pending_object_deletions` before deploying the Battlelog
cleanup worker. Removing a battle and recording its object deletion intent
commit in one database transaction. The record and public link disappear
immediately; object storage cleanup can complete later.

The worker polls every five seconds, processes at most 100 records with four
concurrent deletions, and retries failures after one minute. It invalidates
analytics and removes the R2 object before deleting the intent. Repeated
deletion of an already absent object is safe.

Inspect pending cleanup without loading battle payloads:

```sql
SELECT "battleId", "userId", "createdAt", "retryAt"
FROM "battle_object_deletions"
ORDER BY "retryAt";
```

After restoring Redis/R2 connectivity, retain these rows for the worker to
drain. Do not drop the table during rollback; older versions do not process
it, so retain a compatible worker until the backlog is empty. The migration
cannot recover object identifiers lost by deletions before it was installed.
`db:migrate:init` adopts only the historical schema; it never marks this new
migration as applied without executing its SQL.
