import { guildKillActivityTable } from "#src/database/drizzle/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { readPublishedFeedEntry } from "#src/feed/user-feed";

export const makeGuildKillActivityPublisher = (
  database: typeof ApiDatabase.Service,
  rabbit: Pick<typeof RabbitMessaging.Service, "publish">,
) =>
  Effect.fn("GuildKillActivity.publish")(
    function* (input: {
      guildId: string;
      world: string;
      npcId: number;
      lastKilledAt: Date;
    }) {
      const minute = new Date(
        Math.floor(input.lastKilledAt.getTime() / 60000) * 60000,
      );
      const feedEntry = yield* readPublishedFeedEntry(database, input.guildId, {
        kill: { ...input, minute },
      });
      if (!feedEntry || feedEntry.type !== "kill") return;
      const sourceNpcs = yield* database
        .selectDistinct({
          level: guildKillActivityTable.npcLvl,
          type: guildKillActivityTable.npcType,
        })
        .from(guildKillActivityTable)
        .where(
          and(
            eq(guildKillActivityTable.guildId, input.guildId),
            eq(guildKillActivityTable.world, input.world),
            eq(guildKillActivityTable.npcId, input.npcId),
            gte(guildKillActivityTable.occurredAt, minute),
            lt(
              guildKillActivityTable.occurredAt,
              new Date(minute.getTime() + 60000),
            ),
          ),
        );
      yield* rabbit.publish({
        exchange: "default",
        routingKey: RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1,
        messageId: `${feedEntry.id}:${feedEntry.version}`,
        content: new TextEncoder().encode(
          JSON.stringify({
            version: 1,
            sourceNpcs,
            guildId: input.guildId,
            world: input.world,
            npc: { type: feedEntry.npc.type, lvl: feedEntry.npc.lvl },
            feedEntry,
          }),
        ),
      });
    },
    Effect.timeout("2 seconds"),
    Effect.catch(() =>
      Effect.logWarning(
        "Live guild kill publication failed; history remains available",
      ),
    ),
  );

/** Batches avoid one unbounded transaction when cleanup catches up after downtime. */
export const makeGuildKillActivityCleanup = (
  database: typeof ApiDatabase.Service,
) =>
  Effect.fn("GuildKillActivity.cleanup")(function* () {
    const cutoff = new Date(
      (yield* Clock.currentTimeMillis) - 86400000,
    ).toISOString();
    let removed = 0;
    for (let batch = 0; batch < 100; batch++) {
      const result =
        yield* database.execute(sql`DELETE FROM "GuildKillActivity" WHERE id IN (
      SELECT id FROM "GuildKillActivity" WHERE "occurredAt" < ${cutoff}::timestamptz AT TIME ZONE 'UTC'
      ORDER BY "occurredAt",id LIMIT 5000 FOR UPDATE SKIP LOCKED
    ) RETURNING id`);
      const decoded = yield* Schema.decodeUnknownEffect(
        Schema.Struct({
          rows: Schema.Array(Schema.Struct({ id: Schema.String })),
        }),
      )(result);
      removed += decoded.rows.length;
      if (decoded.rows.length < 5000) break;
    }
    yield* Effect.logInfo("Expired guild kill activity deleted", { removed });
  });
