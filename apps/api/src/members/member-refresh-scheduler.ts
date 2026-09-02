import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { Job, Queue as BullQueue } from "bullmq";
import { Effect, Schema } from "effect";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";

export interface MemberRefreshJobData {
  readonly discordId: string;
  readonly guildId: string;
  readonly userId: string;
  readonly priority: number;
  readonly reason: string;
}

export interface MemberRefreshScheduleResult {
  readonly queued: boolean;
  readonly nextRefreshAt: Date | null;
}

type MemberRefreshJobState =
  | "active"
  | "completed"
  | "delayed"
  | "failed"
  | "paused"
  | "prioritized"
  | "unknown"
  | "waiting"
  | "waiting-children";

export class MemberRefreshSchedulerFailure extends TaggedErrorClass<MemberRefreshSchedulerFailure>()(
  "MemberRefreshSchedulerFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface MemberRefreshSchedulerPorts {
  readonly nextRefreshAt: (
    userId: string,
  ) => Effect.Effect<Date | null, unknown>;
  readonly recordMetric: (options: {
    readonly outcome: "delayed" | "queued";
    readonly reason: string;
  }) => Effect.Effect<unknown, unknown>;
  readonly getLock: (key: string) => Effect.Effect<string | null, unknown>;
  readonly setLock: (
    key: string,
    owner: string,
    ttlSeconds: number,
  ) => Effect.Effect<boolean, unknown>;
  readonly evalLock: (
    script: string,
    keys: string[],
    args: Array<string | number>,
  ) => Effect.Effect<unknown, unknown>;
}

const USER_LOCK_TTL_SECONDS = 30;
const EXTEND_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("EXPIRE", KEYS[1], ARGV[2])
end
return 0
`;
const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

const jobId = (userId: string, guildId: string) =>
  ["member", "refresh", userId, guildId]
    .map((value) => value.replaceAll(":", "_"))
    .join("-");
const lockKey = (userId: string) => `member:refresh:lock:${userId}`;
const errorCode = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "number"
    ? error.code
    : null;

export const makeMemberRefreshScheduler = (
  logger: Logger,
  queue: BullQueue<MemberRefreshJobData>,
  ports: MemberRefreshSchedulerPorts,
) => {
  const bull = <A>(operation: string, run: () => Promise<A>) =>
    Effect.tryPromise({
      try: run,
      catch: (cause) => new MemberRefreshSchedulerFailure({ operation, cause }),
    }).pipe(
      Effect.withSpan(operation, {
        attributes: { adapter: "bullmq", retryCount: 0 },
      }),
    );
  const updateExisting = async (
    job: Job<MemberRefreshJobData>,
    data: MemberRefreshJobData,
    delay: number,
    state: MemberRefreshJobState,
  ) => {
    const nextData = {
      ...job.data,
      ...data,
      priority: Math.min(job.data.priority, data.priority),
    };
    await job.updateData(nextData);
    if ((job.opts.priority ?? nextData.priority) > nextData.priority) {
      try {
        await job.changePriority({ priority: nextData.priority });
      } catch (cause) {
        logger.log({
          level: "debug",
          message: "Failed to reprioritize member refresh job",
          jobId: job.id,
          error: cause,
        });
      }
    }
    if (state !== "delayed") return;
    try {
      if (delay === 0) await job.promote();
      else await job.changeDelay(delay);
    } catch (cause) {
      if (errorCode(cause) === -3 && (await job.getState()) !== "delayed") {
        return;
      }
      logger.log({
        level: "debug",
        message: "Failed to reschedule delayed member refresh job",
        jobId: job.id,
        error: cause,
      });
    }
  };
  const add = (id: string, data: MemberRefreshJobData, delay: number) =>
    queue.add("member-refresh", data, {
      jobId: id,
      delay,
      priority: data.priority,
      attempts: 10,
      backoff: { type: "fixed", delay: 1000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400, count: 1000 },
    });

  const enqueueRefresh = Effect.fn("members.refresh.enqueue")(function* (
    data: MemberRefreshJobData,
  ) {
    const nextRefreshAt = yield* ports.nextRefreshAt(data.userId);
    const delay = nextRefreshAt
      ? Math.max(nextRefreshAt.getTime() - Date.now(), 0)
      : 0;
    yield* bull("members.refresh.queue", async () => {
      const id = jobId(data.userId, data.guildId);
      const existing = await queue.getJob(id);
      if (!existing) {
        await add(id, data, delay);
        return;
      }
      const state = (await existing.getState()) as MemberRefreshJobState;
      if (["completed", "failed", "unknown"].includes(state)) {
        try {
          await existing.remove();
        } catch (cause) {
          if (errorCode(cause) !== -1) throw cause;
        }
        await add(id, data, delay);
        return;
      }
      await updateExisting(existing, data, delay, state);
    });
    yield* ports.recordMetric({ outcome: "queued", reason: data.reason });
    if (delay > 0) {
      yield* ports.recordMetric({ outcome: "delayed", reason: data.reason });
    }
    return { queued: true, nextRefreshAt };
  });

  return {
    enqueueRefresh,
    isUserRefreshLocked: (userId: string) =>
      ports.getLock(lockKey(userId)).pipe(Effect.map(Boolean)),
    acquireUserRefreshLock: (
      userId: string,
      owner: string,
      ttlSeconds = USER_LOCK_TTL_SECONDS,
    ) => ports.setLock(lockKey(userId), owner, ttlSeconds),
    extendUserRefreshLock: (
      userId: string,
      owner: string,
      ttlSeconds: number,
    ) =>
      ports
        .evalLock(EXTEND_LOCK_SCRIPT, [lockKey(userId)], [owner, ttlSeconds])
        .pipe(Effect.asVoid),
    releaseUserRefreshLock: (userId: string, owner: string) =>
      ports
        .evalLock(RELEASE_LOCK_SCRIPT, [lockKey(userId)], [owner])
        .pipe(Effect.asVoid),
    getNextRefreshAt: ports.nextRefreshAt,
  };
};

export type MemberRefreshScheduler = ReturnType<
  typeof makeMemberRefreshScheduler
>;
