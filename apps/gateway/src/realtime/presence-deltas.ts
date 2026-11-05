import type { ServerEvent } from "@lootlog/protocol/realtime";
import { chunk } from "es-toolkit";
import { Effect } from "effect";
import {
  type PresenceChange,
  type PresenceRedis,
  revisionKey,
  withoutLocation,
} from "#src/realtime/presence-records";
import { storeCall } from "#src/realtime/realtime-errors";
import type { RealtimeHub } from "#src/realtime/realtime-hub";

// Keeps a burst's frames far below the socket backpressure limit.
const MAX_DELTA_CHANGES = 100;

const DELTA_FLUSH_CONCURRENCY = 16;

const changedSession = (change: PresenceChange): string =>
  change.action === "upsert" ? change.presence.sessionId : change.sessionId;

/** Coalesced presence changes, published per Organization as revisioned deltas. */
export class PresenceDeltas {
  private readonly queued = new Map<string, Map<string, PresenceChange>>();

  constructor(
    private readonly redis: PresenceRedis,
    private readonly hub: Pick<RealtimeHub, "publishPresence">,
  ) {}

  queue(organizationId: string, change: PresenceChange): void {
    const changes = this.queued.get(organizationId) ?? new Map();
    const sessionId = changedSession(change);

    // A session's latest change supersedes its earlier ones in the batch.
    changes.delete(sessionId);
    changes.set(sessionId, change);
    this.queued.set(organizationId, changes);
  }

  flush(): Effect.Effect<void> {
    return Effect.suspend(() => {
      const batches = [...this.queued];
      this.queued.clear();

      const unpublished = new Set(
        batches.flatMap(([organizationId, changes]) =>
          chunk([...changes.values()], MAX_DELTA_CHANGES).map(
            (changes) => [organizationId, changes] as const,
          ),
        ),
      );

      return Effect.forEach(
        [...unpublished],
        (batch) =>
          this.publish(...batch).pipe(
            Effect.tap(() => Effect.sync(() => unpublished.delete(batch))),
            Effect.catch((error) =>
              Effect.logError(
                "Presence delta publication failed; retrying",
                error,
              ),
            ),
          ),
        { concurrency: DELTA_FLUSH_CONCURRENCY, discard: true },
      ).pipe(
        // Failed and interrupted batches, including those never started,
        // return to the queue for the next flush.
        Effect.ensuring(
          Effect.sync(() => {
            for (const batch of unpublished) this.requeue(...batch);
          }),
        ),
      );
    });
  }

  private publish(
    organizationId: string,
    changes: ReadonlyArray<PresenceChange>,
  ): Effect.Effect<void, unknown> {
    return storeCall("presence.next-revision", () =>
      this.redis.command.incr(revisionKey(organizationId)),
    ).pipe(
      Effect.flatMap((revision) => {
        const makeEvent = (includeLocation: boolean) =>
          ({
            v: 1,
            type: "presence.delta",
            sequence: revision,
            data: {
              organizationId,
              revision,
              changes: changes.map((change) =>
                change.action === "upsert"
                  ? {
                      action: "upsert",
                      presence: {
                        ...(includeLocation
                          ? change.presence
                          : withoutLocation(change.presence)),
                        organizationIds: [organizationId],
                      },
                    }
                  : change,
              ),
            },
          }) satisfies typeof ServerEvent.Type;

        const basicEvent = makeEvent(false);

        const preciseEvent = changes.some(
          (change) =>
            change.action === "upsert" && "location" in change.presence,
        )
          ? makeEvent(true)
          : basicEvent;

        return storeCall("presence.publish-delta", () =>
          this.hub.publishPresence(
            { topic: "organization.presence", organizationId },
            basicEvent,
            preciseEvent,
          ),
        );
      }),
    );
  }

  // Changes queued since the failed flush are newer and keep precedence.
  private requeue(
    organizationId: string,
    changes: ReadonlyArray<PresenceChange>,
  ): void {
    const newer = this.queued.get(organizationId);
    this.queued.delete(organizationId);

    for (const change of [...changes, ...(newer?.values() ?? [])])
      this.queue(organizationId, change);
  }
}
