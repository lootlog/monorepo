import { Effect } from "effect";
import { SingleFlight } from "#src/platform/single-flight";
import {
  type Basic,
  type Precise,
  type PresenceRedis,
  readOrganization,
  revisionKey,
} from "#src/realtime/presence-records";
import { storeCall } from "#src/realtime/realtime-errors";

export type CachedSnapshot = {
  readonly revision: number;
  readonly readAt: number;
  readonly presences: ReadonlyArray<Basic | Precise>;
};

const SNAPSHOT_MAX_AGE_MS = 1_000;

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

  prune(): void {
    for (const [organizationId, snapshot] of this.cached) {
      if (this.now() - snapshot.readAt >= SNAPSHOT_MAX_AGE_MS)
        this.cached.delete(organizationId);
    }
  }
}
