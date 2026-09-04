import { Clock, Effect } from "effect";
import { eq, sql } from "drizzle-orm";
import type { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { memberRefreshJobTable } from "#src/database/drizzle/schema";

export const makeMemberBulkRefreshProcessor = (
  database: ApiDatabaseValue,
  rabbit: Pick<RabbitMessaging["Service"], "publish">,
  refreshMember: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly skipTtlCheck: boolean;
  }) => Effect.Effect<{ readonly refreshQueued: boolean } | null, unknown>,
) => {
  const emitRefreshJobUpdate = (
    jobId: number,
    details: Record<string, readonly string[]> = {},
  ) =>
    database
      .select()
      .from(memberRefreshJobTable)
      .where(eq(memberRefreshJobTable.id, jobId))
      .limit(1)
      .pipe(
        Effect.flatMap((rows) => {
          const job = rows[0];
          return job
            ? rabbit.publish({
                exchange: "default",
                routingKey: RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
                content: new TextEncoder().encode(
                  JSON.stringify({
                    jobId: job.id,
                    guildId: job.guildId,
                    status: job.status,
                    totalMembers: job.totalMembers,
                    processedMembers: job.processedMembers,
                    failedMembers: job.failedMembers,
                    completedAt: job.completedAt,
                    ...details,
                  }),
                ),
              })
            : Effect.void;
        }),
      );
  return (job: {
    readonly data: {
      readonly jobId: number;
      readonly guildId: string;
      readonly memberIds: string[];
    };
  }) =>
    Effect.gen(function* () {
      const { jobId, guildId, memberIds } = job.data;
      yield* database
        .update(memberRefreshJobTable)
        .set({
          status: "PROCESSING",
          updatedAt: new Date(yield* Clock.currentTimeMillis),
        })
        .where(eq(memberRefreshJobTable.id, jobId));
      yield* emitRefreshJobUpdate(jobId);
      const refreshedIds: string[] = [];
      const skippedIds: string[] = [];
      const failedIds: string[] = [];
      let processedMembers = 0;
      for (const memberId of memberIds) {
        const result = yield* Effect.result(
          refreshMember({
            discordId: memberId,
            guildId,
            skipTtlCheck: true,
          }),
        );
        if (result._tag === "Failure") {
          failedIds.push(memberId);
          yield* database
            .update(memberRefreshJobTable)
            .set({
              failedMembers: sql`${memberRefreshJobTable.failedMembers} + 1`,
              updatedAt: new Date(yield* Clock.currentTimeMillis),
            })
            .where(eq(memberRefreshJobTable.id, jobId));
          continue;
        }
        processedMembers += 1;
        const refreshedMember = result.success;
        if (!refreshedMember || refreshedMember.refreshQueued) {
          skippedIds.push(memberId);
        } else {
          refreshedIds.push(memberId);
        }
        if (processedMembers % 5 === 0) {
          yield* database
            .update(memberRefreshJobTable)
            .set({
              processedMembers,
              updatedAt: new Date(yield* Clock.currentTimeMillis),
            })
            .where(eq(memberRefreshJobTable.id, jobId));
          yield* emitRefreshJobUpdate(jobId);
        }
      }
      const completedAt = new Date(yield* Clock.currentTimeMillis);
      yield* database
        .update(memberRefreshJobTable)
        .set({
          status: "COMPLETED",
          processedMembers,
          completedAt,
          updatedAt: completedAt,
        })
        .where(eq(memberRefreshJobTable.id, jobId));
      yield* emitRefreshJobUpdate(jobId, {
        refreshedIds,
        skippedIds,
        failedIds,
      });
    }).pipe(
      Effect.catch((error) =>
        Effect.gen(function* () {
          const failedAt = new Date(yield* Clock.currentTimeMillis);
          yield* database
            .update(memberRefreshJobTable)
            .set({
              status: "FAILED",
              completedAt: failedAt,
              updatedAt: failedAt,
            })
            .where(eq(memberRefreshJobTable.id, job.data.jobId));
          yield* emitRefreshJobUpdate(job.data.jobId);
          return yield* Effect.fail(error);
        }),
      ),
      Effect.withSpan("members.bulkRefresh.process", {
        attributes: { adapter: "bullmq", retryCount: 0 },
      }),
    );
};
