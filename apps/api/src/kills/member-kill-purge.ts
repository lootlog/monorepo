import { and, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberKillBucketTable,
  memberKillPurgeTable,
} from "#src/database/drizzle/kill-statistics.schema";

const CHUNK_MS = 7 * 24 * 60 * 60 * 1000;

const CLAIM_LEASE = "1 hour";

const RUN_BUDGET_MS = 45 * 60 * 1000;

type Claim = Omit<typeof memberKillPurgeTable.$inferSelect, "claimedUntil"> & {
  readonly claimedUntil: Date;
};

export const makeMemberKillPurge = (database: typeof ApiDatabase.Service) => {
  const claimNext = database
    .update(memberKillPurgeTable)
    .set({ claimedUntil: sql`now() + ${CLAIM_LEASE}::interval` })
    .where(
      inArray(
        memberKillPurgeTable.memberId,
        database
          .select({ memberId: memberKillPurgeTable.memberId })
          .from(memberKillPurgeTable)
          .where(
            or(
              isNull(memberKillPurgeTable.claimedUntil),
              lte(memberKillPurgeTable.claimedUntil, sql`now()`),
            ),
          )
          .orderBy(memberKillPurgeTable.createdAt)
          .limit(1)
          .for("update", { skipLocked: true }),
      ),
    )
    .returning()
    .pipe(
      Effect.map(([claim]): Claim | undefined =>
        claim?.claimedUntil
          ? { ...claim, claimedUntil: claim.claimedUntil }
          : undefined,
      ),
    );

  const purgeMember = Effect.fn("MemberKillPurge.member")(function* (
    claim: Claim,
  ) {
    const member = and(
      eq(memberKillBucketTable.guildId, claim.guildId),
      eq(memberKillBucketTable.memberId, claim.memberId),
    );

    const chunk = sql<number>`floor(extract(epoch from ${memberKillBucketTable.periodStart}) * 1000 / ${CHUNK_MS})::int`;

    const chunks = yield* database
      .selectDistinct({ chunk })
      .from(memberKillBucketTable)
      .where(and(member, lt(memberKillBucketTable.periodStart, claim.before)));

    for (const index of chunks
      .map((row) => row.chunk)
      .toSorted((left, right) => left - right)) {
      const start = new Date(index * CHUNK_MS);

      const end = new Date(
        Math.min(start.getTime() + CHUNK_MS, claim.before.getTime()),
      );

      yield* database.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction.execute(
            sql`select set_config('timescaledb.max_tuples_decompressed_per_dml_transaction', '0', true)`,
          );
          yield* transaction
            .delete(memberKillBucketTable)
            .where(
              and(
                member,
                gte(memberKillBucketTable.periodStart, start),
                lt(memberKillBucketTable.periodStart, end),
              ),
            );
        }),
      );
    }

    const owned = and(
      eq(memberKillPurgeTable.memberId, claim.memberId),
      eq(memberKillPurgeTable.claimedUntil, claim.claimedUntil),
    );

    const completed = yield* database
      .delete(memberKillPurgeTable)
      .where(and(owned, eq(memberKillPurgeTable.before, claim.before)))
      .returning({ memberId: memberKillPurgeTable.memberId });

    if (completed.length === 0) {
      yield* database
        .update(memberKillPurgeTable)
        .set({ claimedUntil: null })
        .where(owned);
    }

    yield* Effect.logInfo("Deleted account member kills purged", {
      memberId: claim.memberId,
      chunks: chunks.length,
    });
  });

  return Effect.fn("MemberKillPurge.run")(function* () {
    const deadline = (yield* Clock.currentTimeMillis) + RUN_BUDGET_MS;

    while ((yield* Clock.currentTimeMillis) < deadline) {
      const claim = yield* claimNext;

      if (!claim) return;

      yield* purgeMember(claim).pipe(
        Effect.catch((error) =>
          Effect.logError("Deleted account member kill purge failed", {
            memberId: claim.memberId,
            error,
          }),
        ),
      );
    }
  });
};
