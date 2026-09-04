import { Clock, Effect } from "effect";
import type { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import type { MemberRefreshScheduler } from "./member-refresh-scheduler.js";
import type { MemberRefreshPorts } from "./member-refresh.operations.js";
import { isRetryableMemberRefreshStatus } from "./member-discord-sync-status.js";

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
  return (job: {
    readonly id?: string | number;
    readonly timestamp?: number;
    readonly data: {
      readonly discordId: string;
      readonly guildId: string;
      readonly userId: string;
      readonly reason: string;
    };
  }) => {
    const lockOwner = `job:${job.id}`;
    const startedAt = job.timestamp ?? Date.now();
    return Effect.gen(function* () {
      const acquired = yield* scheduler.acquireUserRefreshLock(
        job.data.userId,
        lockOwner,
      );
      if (!acquired) {
        yield* diagnostic(() =>
          diagnostics.recordMemberRefreshMetric({
            outcome: "failed",
            reason: "MEMBER_REFRESH_LOCKED",
          }),
        );
        return yield* Effect.fail(new Error("MEMBER_REFRESH_LOCKED"));
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
