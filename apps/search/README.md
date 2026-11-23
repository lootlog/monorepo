# Search indexing

Search holds player search. Items and NPCs belong to `apps/catalog`, which
keeps them in its own database and projects them into Meilisearch.

The player consumers, live and replay, each collect up to 50 messages per index over a
two-second window. Each consumer processes one batch at a time and keeps all
deliveries unacknowledged until indexing succeeds. Indexing failures retry the
same ordered batch every five seconds, holding later batches for that index.
Other indexes continue independently. Shutdown requeues outstanding deliveries
through `@lootlog/messaging`.

Indexing collapses repeated document IDs, reads stored documents in chunks of
100, and submits only changed documents in batches of up to 500. Comparisons use the complete serialized document, including
derived search fields, rather than a process-local cache. Replayed successful
updates therefore do not require another indexing task.

Task completion is checked every 250 milliseconds, with a 60-second timeout. A timeout or
failed task retries the batch without individually requeueing its messages. Startup only
updates index settings when the settings owned by this service differ.

After deploying, compare equivalent traffic windows: Meilisearch CPU, indexing
tasks per minute, documents per task, task-status requests, and RabbitMQ message
age and depth. Measure search freshness alongside resource use; the batching
window adds up to three seconds before processing, plus any queue and indexing
time. CPU improvement must be measured on the deployed workload.

The counters `search.index.documents.received`, `search.index.documents.skipped`,
and `search.index.documents.indexed` carry an `index` attribute. Indexed counts
increase only after task success. Skipped counts also include duplicates within
the batch. Received counts include retry attempts.

To rebuild the players index, run `bun run catalog:replay` in `apps/api`: it
replays every looting character to the `search.players.replay` queue.

## Search queries and unknown accounts

A single `search` value uses text search on `/players`. Repeated `search`
parameters retain exact-name filtering.

Player results collapse repeated character IDs within the same world and prefer
the record with a known account: the Game client still reports party members
it has not seen on the map without their account. Different worlds and
different characters remain separate, even when they share a name. The limit is
an upper bound; deduplication can return fewer results.

Records with a character ID truncated by a legacy API writer were repaired by
the API migration `20261123005703_resolve_unknown_player_accounts`. Rebuild the
players index after it: delete every document of the `players` index, then run
`bun run catalog:replay` in `apps/api`. Replay only adds and updates documents,
so without the deletion the truncated and unknown-account documents stay.

Batch retries preserve ordering within a running consumer. Process or connection
loss still returns individual unacknowledged messages to RabbitMQ; this does not
provide version-based ordering across restarts or multiple consumers. A persistent
indexing error holds that index's queue until it recovers, so monitor queue age.
