import { DelayedError } from "bullmq";
import { Clock, Effect, Random } from "effect";
import type { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import type { MemberRefreshScheduler } from "./member-refresh-scheduler.js";
import type { MemberRefreshPorts } from "./member-refresh.operations.js";
import { isRetryableMemberRefreshStatus } from "./member-discord-sync-status.js";

// The user lock covers all of a user's guild jobs, and a Discord refresh
// usually finishes within a second, so a contended job waits about that long.
const LOCKED_RETRY_DELAY_MS = 1000;

export const makeMemberRefreshProcessor = ({
  scheduler,
  diagnostics,
  sync,
}: {
  readonly scheduler: Pick<
    MemberRefreshScheduler,
    | "acquireUserRefreshLock"
    | "getNextRefreshAt"
    | "extendUserRefreshLock"
    | "releaseUserRefreshLock"
  >;
  readonly diagnostics: Pick<
    DiscordSyncDiagnosticsService,
    "recordMemberRefreshMetric" | "recordMemberRefreshLatency"
  >;
  readonly sync: {
    readonly syncMemberFromDiscord: MemberRefreshPorts["syncMember"];
  };
}) => {
  const diagnostic = <A>(operation: () => Promise<A>) =>
    Effect.tryPromise({ try: operation, catch: (cause) => cause });

  return (
    job: {
      readonly id?: string | number;
      readonly timestamp?: number;
      readonly data: {
        readonly discordId: string;
        readonly guildId: string;
        readonly userId: string;
        readonly reason: string;
      };
      readonly moveToDelayed: (
        timestamp: number,
        token?: string,
      ) => Promise<void>;
    },
    token?: string,
  ) => {
    const lockOwner = `job:${job.id}`;
    const startedAt = job.timestamp ?? Date.now();

    return Effect.gen(function* () {
      const acquired = yield* scheduler.acquireUserRefreshLock(
        job.data.userId,
        lockOwner,
      );

      if (!acquired) {
        // Another guild job for the same user holds the lock. Delaying keeps
        // the job, its priority and its attempts; failing would burn an
        // attempt on contention alone.
        const now = yield* Clock.currentTimeMillis;

        const nextRefreshAt = yield* scheduler.getNextRefreshAt(
          job.data.userId,
        );

        const jitter = yield* Random.nextIntBetween(0, LOCKED_RETRY_DELAY_MS);

        yield* Effect.tryPromise(() =>
          job.moveToDelayed(
            Math.max(nextRefreshAt?.getTime() ?? 0, now) +
              LOCKED_RETRY_DELAY_MS +
              jitter,
            token,
          ),
        );
        yield* diagnostic(() =>
          diagnostics.recordMemberRefreshMetric({
            outcome: "delayed",
            reason: "MEMBER_REFRESH_LOCKED",
          }),
        ).pipe(Effect.ignore);

        return yield* Effect.fail(new DelayedError());
      }

      const process = Effect.gen(function* () {
        const nextRefreshAt = yield* scheduler.getNextRefreshAt(
          job.data.userId,
        );

        if (
          nextRefreshAt &&
          nextRefreshAt.getTime() > (yield* Clock.currentTimeMillis)
        ) {
          const waitMs =
            nextRefreshAt.getTime() - (yield* Clock.currentTimeMillis);

          yield* scheduler.extendUserRefreshLock(
            job.data.userId,
            lockOwner,
            Math.ceil(waitMs / 1000) + 30,
          );
          yield* Effect.sleep(`${waitMs} millis`);
        }

        const result = yield* sync.syncMemberFromDiscord(job.data);

        if (isRetryableMemberRefreshStatus(result.status)) {
          if (result.status === "RATE_LIMITED") {
            yield* diagnostic(() =>
              diagnostics.recordMemberRefreshMetric({
                outcome: "rate_limited",
                reason: job.data.reason,
              }),
            );
          }

          yield* diagnostic(() =>
            diagnostics.recordMemberRefreshMetric({
              outcome: "failed",
              reason: result.status,
            }),
          );

          return yield* Effect.fail(
            new Error(`MEMBER_REFRESH_${result.status}`),
          );
        }

        yield* diagnostic(() =>
          diagnostics.recordMemberRefreshMetric({
            outcome: "processed",
            reason: result.status,
          }),
        );
      });

      return yield* process.pipe(
        Effect.tapError((error) =>
          diagnostic(() =>
            diagnostics.recordMemberRefreshMetric({
              outcome: "failed",
              reason: error instanceof Error ? error.message : "UNKNOWN",
            }),
          ).pipe(Effect.ignore),
        ),
        Effect.ensuring(
          Effect.all(
            [
              diagnostic(() =>
                diagnostics.recordMemberRefreshLatency(Date.now() - startedAt),
              ).pipe(Effect.ignore),
              scheduler
                .releaseUserRefreshLock(job.data.userId, lockOwner)
                .pipe(Effect.ignore),
            ],
            { concurrency: "unbounded", discard: true },
          ),
        ),
      );
    });
  };
};
