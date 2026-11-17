import { acquireBullQueue, acquireBullWorker } from "@lootlog/database/bullmq";
import type { Job, Queue } from "bullmq";
import { Context, Effect, Layer, type Redacted } from "effect";
import { MEMBER_REFRESH_QUEUE } from "#src/members/member-refresh-queue";
import type { MemberRefreshJobData } from "#src/members/member-refresh-scheduler";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

/** The queue the member refresh scheduler deduplicates and delays jobs in. */
export class MemberRefreshQueue extends Context.Service<
  MemberRefreshQueue,
  Queue<MemberRefreshJobData>
>()("@lootlog/api/MemberRefreshQueue") {
  static readonly layer = Layer.effect(
    MemberRefreshQueue,
    Effect.flatMap(ApiRuntimeConfig, ({ redisUrl }) =>
      acquireBullQueue<MemberRefreshJobData>(MEMBER_REFRESH_QUEUE, redisUrl),
    ),
  );
}

export const acquireMemberRefreshWorker = (
  redisUrl: Redacted.Redacted<string>,
  process: (job: Job<MemberRefreshJobData>, token?: string) => Promise<void>,
) =>
  acquireBullWorker(MEMBER_REFRESH_QUEUE, redisUrl, process, {
    concurrency: 10,
  });
