import { describe, expect, it, mock } from "bun:test";
import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { makeMemberRefreshProcessor } from "./member-refresh.processor.js";
import type { MemberSyncResult } from "./member.types.js";

const job = {
  id: "refresh-1",
  data: {
    userId: "user-1",
    discordId: "discord-1",
    guildId: "guild-1",
    reason: "MANUAL",
  },
};
const makeDependencies = () => ({
  scheduler: {
    acquireUserRefreshLock: mock((_userId: string, _owner: string) =>
      Effect.succeed(true),
    ),
    getNextRefreshAt: mock((_userId: string): Effect.Effect<Date | null> =>
      Effect.succeed(null),
    ),
    extendUserRefreshLock: mock(
      (_userId: string, _owner: string, _ttl: number) => Effect.void,
    ),
    releaseUserRefreshLock: mock(
      (_userId: string, _owner: string) => Effect.void,
    ),
  },
  diagnostics: {
    recordMemberRefreshMetric: mock(
      (_options: { outcome: string; reason?: string }) => Promise.resolve(),
    ),
    recordMemberRefreshLatency: mock((_latency: number) => Promise.resolve()),
  },
  sync: {
    syncMemberFromDiscord: mock(
      (
        _data: Omit<typeof job.data, "reason">,
      ): Effect.Effect<MemberSyncResult, unknown> =>
        Effect.succeed({
          member: null,
          status: "SUCCESS",
          nextRefreshAt: null,
        }),
    ),
  },
});

describe("member refresh processor", () => {
  it("retries a locked user without syncing or releasing another owner's lock", async () => {
    const dependencies = makeDependencies();
    dependencies.scheduler.acquireUserRefreshLock.mockReturnValue(
      Effect.succeed(false),
    );
    const result = await Effect.runPromise(
      Effect.result(makeMemberRefreshProcessor(dependencies)(job)),
    );
    expect(result).toMatchObject({
      _tag: "Failure",
      failure: new Error("MEMBER_REFRESH_LOCKED"),
    });
    expect(dependencies.sync.syncMemberFromDiscord).not.toHaveBeenCalled();
    expect(
      dependencies.scheduler.releaseUserRefreshLock,
    ).not.toHaveBeenCalled();
  });

  it("surfaces transient Discord status for retry and releases the acquired lock", async () => {
    const dependencies = makeDependencies();
    dependencies.sync.syncMemberFromDiscord.mockReturnValue(
      Effect.succeed({
        member: null,
        status: "RATE_LIMITED",
        nextRefreshAt: null,
      }),
    );
    const result = await Effect.runPromise(
      Effect.result(makeMemberRefreshProcessor(dependencies)(job)),
    );
    expect(result).toMatchObject({
      _tag: "Failure",
      failure: new Error("MEMBER_REFRESH_RATE_LIMITED"),
    });
    expect(dependencies.scheduler.releaseUserRefreshLock).toHaveBeenCalledWith(
      "user-1",
      "job:refresh-1",
    );
    expect(
      dependencies.diagnostics.recordMemberRefreshMetric,
    ).toHaveBeenCalledWith({
      outcome: "rate_limited",
      reason: "MANUAL",
    });
    expect(
      dependencies.diagnostics.recordMemberRefreshLatency,
    ).toHaveBeenCalled();
  });

  it("respects the next refresh time while extending and finally releasing the user lock", async () => {
    const dependencies = makeDependencies();
    const now = Date.UTC(2026, 8, 4, 12);
    dependencies.scheduler.getNextRefreshAt.mockReturnValue(
      Effect.succeed(new Date(now + 60_000)),
    );
    await Effect.gen(function* () {
      yield* TestClock.setTime(now);
      const fiber = yield* makeMemberRefreshProcessor(dependencies)(job).pipe(
        Effect.forkScoped,
      );
      yield* Effect.yieldNow;
      expect(dependencies.sync.syncMemberFromDiscord).not.toHaveBeenCalled();
      yield* TestClock.adjust("1 minute");
      yield* Fiber.join(fiber);
    }).pipe(
      Effect.scoped,
      Effect.provide(TestClock.layer()),
      Effect.runPromise,
    );
    expect(dependencies.scheduler.extendUserRefreshLock).toHaveBeenCalledWith(
      "user-1",
      "job:refresh-1",
      90,
    );
    expect(dependencies.sync.syncMemberFromDiscord).toHaveBeenCalledWith(
      job.data,
    );
    expect(dependencies.scheduler.releaseUserRefreshLock).toHaveBeenCalledWith(
      "user-1",
      "job:refresh-1",
    );
  });
});
