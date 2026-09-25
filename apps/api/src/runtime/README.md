# API background delivery

Loot acceptance commits its record and publication intents in one transaction.
After a new or appended submission commits, it signals the local publication
worker. A capacity-one dropping queue coalesces bursts without blocking the
request. A signal received during dispatch remains pending for the next pass.
Pure duplicate submissions do not wake the worker.

The worker dispatches at startup and waits for either a signal or one second
between passes. The fallback discovers work after a lost signal, process restart,
or acceptance by another replica. Each pass attempts at most 100 intents and
never overlaps another pass in the same worker. The dispatcher still locks one
intent per transaction, waits for broker confirmation, and deletes only delivered
intents. Failed deliveries remain durable with their stable message IDs. Monitor
`loot.publication.age_ms` to assess production delivery latency.

Automatic timers process at most three Organizations concurrently per request.
Each Organization keeps its own timer and deduplication locks. Results retain the
access query's order, even when writes finish in a different order. A failure for
one Organization does not cancel work for the others.

After a timer commits, its realtime and notification publications run concurrently.
Both settle before the deduplication lock is released. For a synthetic timer
replacement, both deletion publications must succeed before either update starts.
A failed publication still reports that Organization as failed after persistence;
the existing 30-second deduplication cache can return its stored timer on retry
without retrying publication.

If the timer commits but writing its Redis result fails, the next automatic
submission checks the timer's CREATE history under the timer lock. For the same
Organization, world, and timer key, acceptance within 30 seconds returns the
existing timer without moving its spawn window or adding history. Resets,
restores, and event respawn windows write no CREATE history and do not extend
this window. This is bounded deduplication, not a durable request identity:
clients must not replay old submissions. Deploy this guard before enabling
automatic-timer retries in the Game client.

RabbitMQ consumers in this API replica share five handler slots. Each queue uses
prefetch one, bounding waiting deliveries and retaining sequential processing
within that queue. BullMQ workers retain their separate concurrency settings.
