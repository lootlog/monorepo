import { Effect } from "effect";
import { SingleFlight } from "#src/platform/single-flight";
import {
  type Basic,
  type Precise,
  type PresenceRedis,
  readOrganization,
  revisionKey,
  storeCall,
} from "#src/realtime/presence-records";

export type CachedSnapshot = {
  readonly revision: number;
  readonly readAt: number;
  readonly presences: ReadonlyArray<Basic | Precise>;
};

// A cached snapshot is served only while its revision is current, so every
// change missing from it reaches the viewer as a later delta. The age bound
// keeps heartbeat-refreshed lastSeen values from drifting.
const SNAPSHOT_MAX_AGE_MS = 1_000;

/** Organization presence snapshots, shared by concurrent viewers of one revision. */
export class PresenceSnapshots {
  private readonly pending = new SingleFlight<
    string,
    CachedSnapshot,
    unknown
  >();

  private readonly cached = new Map<string, CachedSnapshot>();

  constructor(
    private readonly redis: PresenceRedis,
    private readonly now: () => number,
  ) {}

  read(organizationId: string): Effect.Effect<CachedSnapshot, unknown> {
    // Read the revision first: every change absent from the rows read after
    // it increments the revision later and reaches viewers as a delta.
    return storeCall("presence.get-revision", () =>
      this.redis.command.get(revisionKey(organizationId)),
    ).pipe(
      Effect.flatMap((value) => {
        const revision = Number(value ?? 0);
        const cached = this.cached.get(organizationId);

        if (
          cached?.revision === revision &&
          this.now() - cached.readAt < SNAPSHOT_MAX_AGE_MS
        )
          return Effect.succeed(cached);

        const readAt = this.now();

        // Offline decisions and coverage require their own fresh read.
        return this.pending.run(
          JSON.stringify([organizationId, revision]),
          readOrganization(this.redis, organizationId, this.now).pipe(
            Effect.timeout("10 seconds"),
            Effect.map((presences) => {
              const snapshot = { revision, readAt, presences };
              const current = this.cached.get(organizationId);

              if (!current || current.readAt <= readAt)
                this.cached.set(organizationId, snapshot);

              return snapshot;
            }),
          ),
        );
      }),
    );
  }

  /** Drops snapshots too old to serve, so idle Organizations release memory. */
  prune(): void {
    for (const [organizationId, snapshot] of this.cached) {
      if (this.now() - snapshot.readAt >= SNAPSHOT_MAX_AGE_MS)
        this.cached.delete(organizationId);
    }
  }
}
