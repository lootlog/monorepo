# Search indexing

The three RabbitMQ consumers collect up to 50 messages per index over a
two-second window. Each consumer processes one batch at a time and keeps all
deliveries unacknowledged until indexing succeeds. Indexing failures retry the
same ordered batch every five seconds, holding later batches for that index.
Other indexes continue independently. Shutdown requeues outstanding deliveries
through `@lootlog/messaging`.

Indexing collapses repeated document IDs, reads stored documents in chunks of
100, and submits only changed documents in batches of up to 500. Item updates preserve the union of
known worlds. Comparisons use the complete serialized document, including
derived search fields, rather than a process-local cache. Replayed successful
updates therefore do not require another indexing task.

Task completion is checked every 15 seconds, with a 60-second timeout. A timeout or
failed task retries the batch without individually requeueing its messages. Startup only
updates index settings when the settings owned by this service differ.

After deploying, compare equivalent traffic windows: Meilisearch CPU, indexing
tasks per minute, documents per task, task-status requests, and RabbitMQ message
age and depth. Measure search freshness alongside resource use; the batching
window adds up to two seconds before processing, plus any queue and indexing
time. CPU improvement must be measured on the deployed workload.

The counters `search.index.documents.received`, `search.index.documents.skipped`,
and `search.index.documents.indexed` carry an `index` attribute. Indexed counts
increase only after task success. Item counts start after merging duplicate IDs
and their worlds; player and NPC skipped counts also include duplicates within
the batch. Received counts include retry attempts.

This changes no HTTP schemas, RabbitMQ payloads, queue declarations, or document
primary keys. Deployment and rollback require no data migration.

## Search queries and legacy player records

A single `search` value uses text search on `/players` and `/npcs`, as on `/all`.
Repeated `search` parameters retain exact-name filtering.

Player results collapse repeated character IDs within the same world and prefer
records with a known account. An unknown-account record is also omitted when a
known-account result has the same name and world: older records may contain a
truncated character ID. Different worlds and different known characters remain
separate. The limit is an upper bound; deduplication can return fewer results.

The API's normalization of unknown-account character IDs is unchanged by this
search-only change. Existing stored records are not rewritten or deleted;
physical cleanup and a new index identity would require a separate migration.

Batch retries preserve ordering within a running consumer. Process or connection
loss still returns individual unacknowledged messages to RabbitMQ; this does not
provide version-based ordering across restarts or multiple consumers. A persistent
indexing error holds that index's queue until it recovers, so monitor queue age.
