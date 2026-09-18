# Search indexing

The three RabbitMQ consumers collect up to 50 messages per index over a
two-second window. Each consumer processes one batch at a time and keeps all
deliveries unacknowledged until indexing succeeds. Failed batches are requeued;
shutdown requeues outstanding deliveries through `@lootlog/messaging`.

Indexing collapses repeated document IDs, reads stored documents in chunks of
100, and submits only changed documents in batches of up to 500. Item updates preserve the union of
known worlds. Comparisons use the complete serialized document, including
derived search fields, rather than a process-local cache. Replayed successful
updates therefore do not require another indexing task.

Task completion is checked every 15 seconds, with a 60-second timeout. A timeout or
failed task leaves the RabbitMQ messages eligible for redelivery. Startup only
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
