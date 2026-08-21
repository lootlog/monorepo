# Gateway rules

Read the root `PRODUCT.md`, `ARCHITECTURE.md`, and `SECURITY.md` before changing
this app.

- Authenticate sockets before subscription and re-evaluate rooms when
  Organization membership or mapped access changes.
- HTTP visibility, socket room membership, per-event delivery, and fetch
  snapshots must enforce the same Organization and resource policy.
- Redis federates live Socket.IO state; it is not a durable Presence store.
- Basic online state and precise location are separate target capabilities.
- Margonem-signed proof is optional. Preserve the distinction between verified
  and authenticated self-reported Presence without making core availability
  depend on the upstream proof.
- Treat presence heartbeat, expiry, last-seen, and snapshot revision as one
  contract when implementing the target model.
- Preserve event compatibility across independently deployed API, gateway, and
  game-client versions.
- Keep NestJS DI dependencies as value imports when runtime metadata needs them.

Before handoff, run relevant gateway tests, lint, and the app build or typecheck
path used by CI. Add reconnect, room-rebalance, stale-state, and duplicate-event
coverage when those paths change.
