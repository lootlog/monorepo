# Battlelog service rules

Read the root `PRODUCT.md`, `ARCHITECTURE.md`, and `SECURITY.md` plus
`packages/battle-processor/AGENTS.md` before changing battle contracts.

- Battlelog owns raw battle payloads, durable battle records, and derived battle
  statistics.
- Preserve submission idempotency, battle hashes, participant ordering, and
  public battle-link behavior unless the change includes a migration.
- Version recorded mechanics and payloads needed by replay and the future
  simulator. Do not infer missing historical facts and store them as observed.
- Public visibility is explicit and reversible. Organization or private data
  does not become public through statistics or object storage.
- Treat heavy raw payload retention separately from stable derived records.

Before handoff, run relevant Vitest files, lint, and the service build or
typecheck path used by CI. Add generated-client or compatibility coverage when
the public or deployed contract changes.
