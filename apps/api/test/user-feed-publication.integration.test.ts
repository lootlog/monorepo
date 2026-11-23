import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { makeUserFeedFixture } from "./user-feed-fixtures.js";
import { eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { UserFeedItem } from "@lootlog/protocol/feed";
import { MessagingError, type PublishOptions } from "@lootlog/messaging";
import { memberTable } from "#src/database/drizzle/organization.schema";
import { guildKillActivityTable } from "#src/database/drizzle/kill-statistics.schema";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/user.schema";
import { makeUserFeed } from "../src/users/user-feed.js";
import {
  makeGuildKillActivityCleanup,
  makeGuildKillActivityPublisher,
} from "#src/kills/guild-kill-activity";
import { makeKillCreation } from "#src/kills/kill-creation";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";
import { Client } from "pg";

const fixture = makeUserFeedFixture();

const { client, now, recent, run, seed, kill } = fixture;

let database: typeof ApiDatabase.Service;

describe("personal Organization activity feed publication", () => {
  beforeAll(async () => {
    database = await fixture.connect();
  });
  afterAll(fixture.close);
  it("publishes the same versioned group as HTTP with all source visibility metadata", async () => {
    const { guild, owner } = await seed();
    await run(kill(guild.id));
    await run(kill(guild.id, { npcLvl: 200 }));
    const messages: PublishOptions[] = [];
    await run(
      makeGuildKillActivityPublisher(database, {
        publish: (message) =>
          Effect.sync(() => {
            messages.push(message);
          }),
      })({
        guildId: guild.id,
        world: "tempest",
        npcId: 1,
        lastKilledAt: recent,
      }),
    );
    expect(messages).toHaveLength(1);
    const message = messages[0];

    if (!message) throw new Error("Missing publication");

    const payload = Schema.decodeUnknownSync(
      Schema.Struct({
        feedEntry: UserFeedItem,
        sourceNpcs: Schema.Array(
          Schema.Struct({ level: Schema.Finite, type: Schema.String }),
        ),
      }),
    )(JSON.parse(new TextDecoder().decode(message.content)));

    expect(payload.feedEntry).toEqual(
      (await run(makeUserFeed(database)(owner))).items[0]!,
    );
    expect(payload.feedEntry.version).toBe(2);
    expect(payload.sourceNpcs.map((npc) => npc.level).sort()).toEqual([
      100, 200,
    ]);
  });
  it("does not retry failed publication and keeps history until cleanup", async () => {
    const { guild, owner } = await seed();
    const id = crypto.randomUUID();
    await run(kill(guild.id, { id }));
    const messages: PublishOptions[] = [];

    const publish = (message: PublishOptions) => {
      messages.push(message);

      return Effect.fail(
        new MessagingError({
          operation: "publish",
          message: "offline",
          cause: new Error("offline"),
        }),
      );
    };

    await run(
      makeGuildKillActivityPublisher(database, { publish })({
        guildId: guild.id,
        world: "tempest",
        npcId: 1,
        lastKilledAt: recent,
      }),
    );
    expect(messages).toHaveLength(1);
    expect((await run(makeUserFeed(database)(owner))).items).toHaveLength(1);
    const old = crypto.randomUUID();
    await run(
      kill(guild.id, {
        id: old,
        occurredAt: new Date(Date.now() - 25 * 3600000),
      }),
    );
    await run(
      database
        .update(guildKillActivityTable)
        .set({ occurredAt: new Date(Date.now() - 25 * 3600000) })
        .where(eq(guildKillActivityTable.id, id)),
    );

    const locked = new Client({
      connectionString: requireIsolatedTestDatabase(),
    });

    await locked.connect();

    try {
      await locked.query("BEGIN");
      await locked.query(
        'SELECT id FROM "GuildKillActivity" WHERE id = $1 FOR UPDATE',
        [old],
      );
      await run(makeGuildKillActivityCleanup(database)());

      const remaining = await run(
        database
          .select()
          .from(guildKillActivityTable)
          .where(eq(guildKillActivityTable.guildId, guild.id)),
      );

      expect(remaining.map((row) => row.id)).toEqual([old]);
      await locked.query("ROLLBACK");
      await run(makeGuildKillActivityCleanup(database)());
      expect(
        await run(
          database
            .select()
            .from(guildKillActivityTable)
            .where(eq(guildKillActivityTable.guildId, guild.id)),
        ),
      ).toEqual([]);
    } finally {
      await locked.query("ROLLBACK");
      await locked.end();
    }
  });
  it("records one journal event per accepted guild kill and rolls aggregate updates back if journaling fails", async () => {
    const { guild, owner } = await seed();
    await run(
      database.insert(memberTable).values({
        userId: owner,
        guildId: guild.id,
        name: "Owner",
        globalUserId: owner,
        updatedAt: now,
      }),
    );
    await run(
      database.insert(userCharactersLootlogSettingsTable).values({
        userId: owner,
        accountId: "1",
        characterId: "1",
        catchingGuildIds: [guild.id],
        updatedAt: now,
      }),
    );
    const seen = new Map<string, string>();
    const published = Promise.withResolvers<void>();
    let publicationCount = 0;

    const create = makeKillCreation(
      database,
      {
        invalidateScopes: () => Effect.void,
        deleteIfValue: (key, value) =>
          Effect.sync(() => {
            return Number(seen.get(key) === value && seen.delete(key));
          }),
        setNx: (key, value) =>
          Effect.sync(() => {
            if (seen.has(key)) return false;
            seen.set(key, value);

            return true;
          }),
        setNxGet: () => Effect.succeed(null),
      },
      makeGuildKillActivityPublisher(database, {
        publish: () => {
          publicationCount++;
          published.resolve();

          return Effect.fail(
            new MessagingError({
              operation: "publish",
              message: "offline",
              cause: new Error("offline"),
            }),
          );
        },
      }),
    );

    const input = {
      world: "tempest",
      accountId: "1",
      characterId: "1",
      npc: { id: 123, name: "Hero", lvl: 100, wt: 80, prof: "p" },
    };

    await run(create(owner, input));
    await published.promise;
    await run(create(owner, input));
    expect(publicationCount).toBe(1);

    const acceptedSums = await client.query(
      `SELECT kills FROM "GuildKillBucket" WHERE "guildId"=$1`,
      [guild.id],
    );

    expect(acceptedSums.rows).toEqual([{ kills: 1 }]);
    expect((await run(makeUserFeed(database)(owner))).items[0]?.npc?.prof).toBe(
      "p",
    );
    expect(
      await run(
        database
          .select()
          .from(guildKillActivityTable)
          .where(eq(guildKillActivityTable.guildId, guild.id)),
      ),
    ).toHaveLength(1);
    await client.query(
      `CREATE FUNCTION reject_feed_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."npcName"='FAIL_FEED_TEST' THEN RAISE EXCEPTION 'journal rejected'; END IF; RETURN NEW; END $$`,
    );
    await client.query(
      `CREATE TRIGGER reject_feed_test BEFORE INSERT ON "GuildKillActivity" FOR EACH ROW EXECUTE FUNCTION reject_feed_test()`,
    );

    try {
      await run(
        create(owner, {
          ...input,
          npc: { ...input.npc, id: 456, name: "FAIL_FEED_TEST" },
        }),
      );

      const sums = await client.query(
        `SELECT kills FROM "GuildKillBucket" WHERE "guildId"=$1 AND "npcName"='FAIL_FEED_TEST'`,
        [guild.id],
      );

      expect(sums.rows).toEqual([]);
    } finally {
      await client.query(
        `DROP TRIGGER reject_feed_test ON "GuildKillActivity"`,
      );
      await client.query(`DROP FUNCTION reject_feed_test()`);
    }
  });
});
