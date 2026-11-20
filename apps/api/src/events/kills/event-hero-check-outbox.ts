import type { ApiDatabase } from "#src/database/drizzle/database";
import { eventHeroCheckOutboxTable } from "#src/database/drizzle/event-hero-check-outbox.schema";
import type { EventHeroKillJobData } from "#src/events/kills/check-event-hero-kill-params";
import { makeOutboxDispatcher } from "#src/shared/outbox-worker";
import type { Effect } from "effect";

export interface EventHeroCheckJob {
  readonly jobId: string;
  readonly data: EventHeroKillJobData;
}

/**
 * Enqueues committed event hero checks. The deterministic job id and the kill
 * processor's window dedup make a repeated enqueue safe, so a failure after
 * enqueueing only costs a duplicate no-op job.
 */
export const makeEventHeroCheckDispatcher = (
  database: typeof ApiDatabase.Service,
  enqueue: (job: EventHeroCheckJob) => Effect.Effect<void, unknown>,
) =>
  makeOutboxDispatcher(
    "EventHeroCheckOutbox",
    database,
    eventHeroCheckOutboxTable,
    (row) => enqueue({ jobId: row.jobId, data: row.payload }),
  );
