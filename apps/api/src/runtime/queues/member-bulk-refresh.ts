import { promiseOperation } from "@lootlog/instrumentation/operation";
import { acquireBullQueue, acquireBullWorker } from "@lootlog/database/bullmq";
import type { Job } from "bullmq";
import { Context, Effect, Layer, type Redacted } from "effect";
import { MEMBER_BULK_REFRESH_QUEUE } from "#src/members/member-refresh-queue";
import type { MemberBulkRefreshJobData } from "#src/members/member.types";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

export class MemberBulkRefreshQueue extends Context.Service<
  MemberBulkRefreshQueue,
  {
    readonly enqueue: (
      data: MemberBulkRefreshJobData,
    ) => Effect.Effect<void, unknown>;
  }
>()("@lootlog/api/MemberBulkRefreshQueue") {
  static readonly layer = Layer.effect(
    MemberBulkRefreshQueue,
    Effect.gen(function* () {
      const { redisUrl } = yield* ApiRuntimeConfig;

      const queue = yield* acquireBullQueue<MemberBulkRefreshJobData>(
        MEMBER_BULK_REFRESH_QUEUE,
        redisUrl,
      );

      return MemberBulkRefreshQueue.of({
        enqueue: (data) =>
          promiseOperation("members.bulkRefresh.queue.add", () =>
            queue.add("bulk-refresh", data, {
              attempts: 3,
              backoff: { type: "exponential", delay: 2000 },
              jobId: `member-bulk-refresh-${data.jobId}`,
            }),
          ).pipe(Effect.asVoid),
      });
    }),
  );
}

export const acquireMemberBulkRefreshWorker = (
  redisUrl: Redacted.Redacted<string>,
  process: (job: Job<MemberBulkRefreshJobData>) => Promise<void>,
) =>
  acquireBullWorker(MEMBER_BULK_REFRESH_QUEUE, redisUrl, process, {
    concurrency: 5,
    limiter: { max: 5, duration: 1000 },
  });
