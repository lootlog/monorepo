# Deployment handoff

This repository change does not deploy or mutate production infrastructure. The
corresponding `lootlog/infra` pull request must consume immutable artifacts built
from the final rewrite commit.

## Identity and rollout constraints

- The workspace is `apps/battlelog` and the package is `@lootlog/battlelog`.
  Keep the deployed service and image identity `battlelog-service` until the
  infrastructure repository changes it explicitly.
- Gateway realtime v1 is not compatible with Socket.IO. Promote Gateway, Web,
  and Game Client as one coordinated cutover; do not mix old consumers with the
  new Gateway.
- Keep Cloudflare runtimes for Workers and frontend delivery. Only install and
  build commands move to Bun.
- Do not rebuild an existing version during promotion or rollback.

## Application order

1. Auth.
2. Battlelog and Search.
3. API and Discord Bot from the same compatible artifact set.
4. Activity.
5. Gateway together with Web and Game Client.

Each database-owning service must pass its fail-closed schema fingerprint before
adopting an existing database. A failed fingerprint is a release stop, not an
instruction to mark the baseline as applied.

## Infrastructure inputs

- Use Bun `1.4.0` for frozen installs and builds.
- Preserve the existing PostgreSQL, TimescaleDB, Redis, RabbitMQ, Meilisearch,
  R2, and Cloudflare bindings and secrets.
- Configure the Gateway WebSocket path and allowed browser origins explicitly.
  Keep credentials out of WebSocket URLs. First-party Web uses its session
  cookie; cross-origin Game Client authentication uses the one-time ticket
  header/subprotocol contract.
- Preserve RabbitMQ exchange, queue, routing, retry, and dead-letter names.
- Apply the additive `LOOTLOG_PRESENCE_LOCATION_READ` permission backfill before
  enforcing precise-location reads.

## Promotion evidence

The infrastructure pull request must attach image digests, non-root and
healthcheck inspection, vulnerability results, bounded shutdown evidence,
database adoption results, two-instance Gateway federation tests, and the
coordinated realtime smoke test. Performance evidence must cover approximately
3,000 WebSockets, an HTTP burst near 1,000 requests per second, and a short soak.
