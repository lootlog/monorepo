# API rules

Read the root `PRODUCT.md`, `CONTEXT.md`, `ARCHITECTURE.md`, and `SECURITY.md`
before changing this app.

- The persisted `Guild` is the Discord guild that anchors one Organization.
  Do not reinterpret it as a single Margonem clan.
- Apply Organization scope to base records, aggregates, history, comments,
  search, cache keys, jobs, events, and notification matching.
- Reuse one visibility decision for a resource and its derived data. A write,
  reset, delete, or comment permission does not bypass read visibility.
- `OWNER` is the recovery authority. Do not assume `ADMIN` may read all
  strategic data when adding new paths.
- API owns Organization operational data. Other services consume versioned APIs
  or events, not the API database.
- Publish facts with idempotent consumers and explicit compatibility when an
  independently deployed consumer exists.
- Keep NestJS DI dependencies as value imports when emitted metadata needs the
  runtime class or token.

Treat the access and cross-Organization items in the root architecture's known
gaps as defects to migrate, not as patterns to copy.

Before handoff, run the relevant Vitest files, `bun run --filter @lootlog/api lint`,
and the app build or typecheck path used by CI. Add contract coverage when an
HTTP, event, or generated-client contract changes.
