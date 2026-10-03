import { requireIsolatedTestDatabase } from "./isolated-test-database.js";
import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { eq, inArray, sql } from "drizzle-orm";
import { Effect, ManagedRuntime, Schema } from "effect";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  guildKillBucketTable,
  guildTable,
  memberKillTotalTable,
  memberKillBucketTable,
  memberTable,
  userKillTotalTable,
  userKillBucketTable,
} from "../src/database/drizzle/schema.js";
import { makeUserAccountDeletion } from "../src/http-api/handlers/account-organization/user-account-deletion.data-layer.js";
import { createGuildFixture } from "./organization-fixtures.js";

const runtime = ManagedRuntime.make(ApiDatabaseLive);

const guildId = `kill-deletion-${randomUUID()}`;

const deletedUser = `${guildId}-deleted`;

const keptUser = `${guildId}-kept`;

/** Decodes the node-postgres result behind `db.execute`. */
const decodeResult = Schema.decodeUnknownSync(
  Schema.Struct({
    rows: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
  }),
);

const run = <A, E>(effect: Effect.Effect<A, E, ApiDatabase>) =>
  runtime.runPromise(effect);

afterAll(async () => {
  await run(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;

      for (const table of [
        memberKillBucketTable,
        memberKillTotalTable,
        guildKillBucketTable,
        memberTable,
      ]) {
        yield* db.delete(table).where(eq(table.guildId, guildId));
      }

      for (const table of [userKillBucketTable, userKillTotalTable]) {
        yield* db
          .delete(table)
          .where(inArray(table.discordUserId, [deletedUser, keptUser]));
      }

      yield* db.delete(guildTable).where(eq(guildTable.id, guildId));
    }),
  );
  await runtime.dispose();
});

test("account deletion removes personal and member kills from compressed TimescaleDB chunks", async () => {
  requireIsolatedTestDatabase();

  await run(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;

      const hypertables = yield* db.execute(
        sql`select hypertable_name, compression_enabled from timescaledb_information.hypertables where hypertable_name in ('UserKillBucket', 'MemberKillBucket', 'GuildKillBucket') order by 1`,
      );

      expect(decodeResult(hypertables).rows).toEqual([
        { hypertable_name: "GuildKillBucket", compression_enabled: true },
        { hypertable_name: "MemberKillBucket", compression_enabled: true },
        { hypertable_name: "UserKillBucket", compression_enabled: true },
      ]);

      yield* db
        .insert(guildTable)
        .values(createGuildFixture({ id: guildId, ownerId: keptUser }));

      const [deleted, kept] = yield* db
        .insert(memberTable)
        .values(
          [deletedUser, keptUser].map((userId) => ({
            guildId,
            userId,
            name: userId,
            updatedAt: new Date(),
          })),
        )
        .returning();

      if (!deleted || !kept) throw new Error("Missing member fixtures");

      const periodStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      periodStart.setUTCMinutes(0, 0, 0);

      const npc = {
        world: "tempest",
        npcId: 1,
        npcName: "Hero",
        npcType: NpcType.HERO,
        npcLvl: 100,
        npcProf: "w",
        npcIcon: null,
        lastKilledAt: periodStart,
      };

      yield* db.insert(memberKillBucketTable).values(
        [deleted, kept].map((member) => ({
          ...npc,
          periodStart,
          guildId,
          memberId: member.id,
          discordUserId: member.userId,
          kills: 3,
        })),
      );
      yield* db.insert(memberKillTotalTable).values(
        [deleted, kept].map((member) => ({
          ...npc,
          guildId,
          memberId: member.id,
          discordUserId: member.userId,
          kills: 2,
        })),
      );
      yield* db.insert(userKillBucketTable).values(
        [deletedUser, keptUser].map((discordUserId) => ({
          ...npc,
          periodStart,
          discordUserId,
          kills: 3,
        })),
      );
      yield* db.insert(userKillTotalTable).values(
        [deletedUser, keptUser].map((discordUserId) => ({
          ...npc,
          discordUserId,
          kills: 2,
        })),
      );
      yield* db
        .insert(guildKillBucketTable)
        .values({ ...npc, periodStart, guildId, kills: 3 });

      const compressed = yield* db.execute(
        sql`select count(compress_chunk(chunk, if_not_compressed => true))::int as chunks from (
          select show_chunks('"MemberKillBucket"', older_than => interval '7 days') as chunk
          union all select show_chunks('"UserKillBucket"', older_than => interval '7 days')
        ) chunks`,
      );

      expect(
        decodeResult(compressed).rows[0]?.["chunks"],
      ).toBeGreaterThanOrEqual(2);

      yield* makeUserAccountDeletion(db, {
        cleanupBattlelog: () => Effect.void,
        deleteCacheKey: () => Effect.void,
        invalidateCacheScopes: () => Effect.void,
        deleteCachePattern: () => Effect.void,
        publishMemberRemoved: () => Effect.void,
      })({ userId: randomUUID(), discordId: deletedUser });

      const remaining = (
        table:
          | typeof memberKillBucketTable
          | typeof memberKillTotalTable
          | typeof userKillBucketTable
          | typeof userKillTotalTable,
      ) =>
        db
          .select({ discordUserId: table.discordUserId })
          .from(table)
          .where(inArray(table.discordUserId, [deletedUser, keptUser]));

      for (const table of [
        memberKillBucketTable,
        memberKillTotalTable,
        userKillBucketTable,
        userKillTotalTable,
      ]) {
        expect(yield* remaining(table)).toEqual([{ discordUserId: keptUser }]);
      }

      expect(
        yield* db
          .select({ kills: guildKillBucketTable.kills })
          .from(guildKillBucketTable)
          .where(eq(guildKillBucketTable.guildId, guildId)),
      ).toEqual([{ kills: 3 }]);
    }),
  );
});
