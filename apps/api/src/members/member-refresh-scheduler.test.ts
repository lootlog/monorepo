import { describe, expect, it, mock } from "bun:test";
import type { Job } from "bullmq";
import { Effect } from "effect";
import { applicationLogger } from "#src/shared/application-logger";
import {
  makeMemberRefreshScheduler,
  type MemberRefreshJobData,
} from "./member-refresh-scheduler.js";

const data: MemberRefreshJobData = {
  discordId: "discord-1",
  guildId: "guild-1",
  userId: "user-1",
  priority: 8,
  reason: "organization-context-stale",
};

const makeScheduler = (refused: boolean) => {
  const queue = {
    getJob: mock(
      (_id: string): Promise<Job<MemberRefreshJobData> | undefined> =>
        Promise.resolve(undefined),
    ),
    add: mock((_name: string, _data: MemberRefreshJobData) =>
      Promise.resolve(),
    ),
  };

  const recordMetric = mock(
    (_options: { outcome: string; reason: string }) => Effect.void,
  );

  const scheduler = makeMemberRefreshScheduler(applicationLogger, queue, {
    nextRefreshAt: () => Effect.succeed(null),
    isRefused: () => Effect.succeed(refused),
    recordMetric,
    getLock: () => Effect.succeed(null),
    setLock: () => Effect.succeed(true),
    evalLock: () => Effect.void,
    releaseLock: () => Effect.void,
  });

  return { scheduler, queue, recordMetric };
};

describe("member refresh scheduler", () => {
  it("does not queue a refresh Discord recently refused", async () => {
    const { scheduler, queue, recordMetric } = makeScheduler(true);

    const result = await Effect.runPromise(scheduler.enqueueRefresh(data));

    // A queued job would only receive the same refusal again.
    expect(result).toEqual({ queued: false, nextRefreshAt: null });
    expect(queue.add).not.toHaveBeenCalled();
    expect(recordMetric.mock.calls).toEqual([
      [{ outcome: "refused", reason: data.reason }],
    ]);
  });

  it("queues a refresh once the refusal has expired", async () => {
    const { scheduler, queue } = makeScheduler(false);

    const result = await Effect.runPromise(scheduler.enqueueRefresh(data));

    expect(result.queued).toBe(true);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
});
