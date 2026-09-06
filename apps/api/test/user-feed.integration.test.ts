import { requireIsolatedTestDatabase } from "./isolated-test-database.js";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { eq } from "drizzle-orm";
import { Effect, ManagedRuntime, Schema } from "effect";
import { UserFeedItem } from "@lootlog/protocol/feed";
import { MessagingError, type PublishOptions } from "@lootlog/messaging";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  roleTable,
  memberToRoleTable,
  guildKillActivityTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { makeUserFeed, userFeedSql } from "#src/feed/user-feed";
import {
  makeGuildKillActivityCleanup,
  makeGuildKillActivityPublisher,
} from "#src/kills/guild-kill-activity";
import { makeKillCreation } from "#src/kills/kill-creation";
import { applicationLogger } from "#src/shared/application-logger";
import { PgDialect } from "drizzle-orm/pg-core";

const client = new Client({ connectionString: requireIsolatedTestDatabase() });
const runtime = ManagedRuntime.make(ApiDatabaseLive);
let database: typeof ApiDatabase.Service;
const now = new Date();
const recent = new Date(Math.floor(now.getTime() / 60000) * 60000 - 120000);
const run = runtime.runPromise.bind(runtime);
const seed = async () => {
  const guildId = randomUUID(),
    owner = randomUUID(),
    reader = randomUUID();
  const [guild] = await run(
    database
      .insert(guildTable)
      .values({ id: guildId, name: "Feed org", ownerId: owner, updatedAt: now })
      .returning(),
  );
  const [member] = await run(
    database
      .insert(memberTable)
      .values({
        userId: reader,
        guildId,
        name: "Reader",
        globalUserId: reader,
        updatedAt: now,
      })
      .returning(),
  );
  const [role] = await run(
    database
      .insert(roleTable)
      .values({
        id: randomUUID(),
        guildId,
        name: "Reader",
        permissions: [Permission.LOOTLOG_ACCESS, Permission.LOOTLOG_LOOTS_READ],
        lvlRangeFrom: 0,
        lvlRangeTo: 150,
        updatedAt: now,
      })
      .returning(),
  );
  if (!guild || !member || !role) throw new Error("Missing fixture");
  await run(
    database.insert(memberToRoleTable).values({ A: member.id, B: role.id }),
  );
  return { guild, owner, reader, member, role };
};
const kill = (
  guildId: string,
  overrides: Partial<typeof guildKillActivityTable.$inferInsert> = {},
) =>
  database.insert(guildKillActivityTable).values({
    id: randomUUID(),
    guildId,
    world: "tempest",
    npcId: 1,
    npcName: "NPC",
    npcType: "ELITE2",
    npcLvl: 100,
    occurredAt: recent,
    ...overrides,
  });

describe("personal Organization activity feed", () => {
  beforeAll(async () => {
    requireIsolatedTestDatabase();
    await client.connect();
    database = await run(ApiDatabase);
  });
  afterAll(async () => {
    await client.end();
    await runtime.dispose();
  });
  it("filters current access and NPC visibility before grouping and limiting, with stable groups", async () => {
    const { guild, reader, owner, member } = await seed();
    await run(kill(guild.id));
    await run(
      kill(guild.id, { occurredAt: new Date(recent.getTime() + 1000) }),
    );
    await run(kill(guild.id, { npcLvl: 300 }));
    await run(kill(guild.id, { npcType: "HERO", npcId: 2 }));
    await run(
      kill(guild.id, {
        npcId: 3,
        occurredAt: new Date(Date.now() - 25 * 3600000),
      }),
    );
    const readerFeed = await run(makeUserFeed(database)(reader));
    expect(readerFeed.items).toHaveLength(1);
    expect(readerFeed.items[0]).toMatchObject({
      type: "kill",
      count: 2,
      guild: { id: guild.id },
      npc: { id: 1, lvl: 100 },
    });
    expect((await run(makeUserFeed(database)(reader))).items[0]?.id).toBe(
      readerFeed.items[0]?.id,
    );
    expect((await run(makeUserFeed(database)(owner))).items).toHaveLength(2);
    expect((await run(makeUserFeed(database)(randomUUID()))).items).toEqual([]);
    await run(
      database
        .update(memberTable)
        .set({ active: false })
        .where(eq(memberTable.id, member.id)),
    );
    expect((await run(makeUserFeed(database)(reader))).items).toEqual([]);
  });
  it("includes separate nonarchived loot records, requiring visibility of every NPC and bounding item previews", async () => {
    const { guild, owner, reader } = await seed();
    const other = await seed();
    await run(
      database
        .update(guildTable)
        .set({ ownerId: owner })
        .where(eq(guildTable.id, other.guild.id)),
    );
    const loot = Schema.decodeUnknownSync(
      Schema.Array(Schema.Struct({ id: Schema.Number })),
    )(
      (
        await client.query(
          `INSERT INTO "Loot" ("uniqueId",world,source,location,"updatedAt") VALUES ($1,'tempest','FIGHT','map',now()) RETURNING id`,
          [randomUUID()],
        )
      ).rows,
    )[0];
    if (!loot) throw new Error("Missing loot");
    await client.query(
      `INSERT INTO "OrganizationLootRecord" ("lootId","guildId","updatedAt") VALUES ($1,$2,now()),($1,$3,now())`,
      [loot.id, guild.id, other.guild.id],
    );
    const npc = Schema.decodeUnknownSync(
      Schema.Array(Schema.Struct({ id: Schema.Number })),
    )(
      (
        await client.query(
          `INSERT INTO "NpcSnapshot" ("npcId",name,type,lvl) VALUES (1,$1,'ELITE2',100) RETURNING id`,
          [randomUUID()],
        )
      ).rows,
    )[0];
    if (!npc) throw new Error("Missing NPC");
    await client.query(
      `INSERT INTO "LootNpc" ("lootId","npcSnapshotId") VALUES ($1,$2)`,
      [loot.id, npc.id],
    );
    await client.query(
      `WITH inserted AS (INSERT INTO "ItemSnapshot" ("itemId","statsHash",name,icon,"statRaw","statsSnapshot") SELECT n,$2||n,'item','item.png','','{}'::jsonb FROM generate_series(1,5)n RETURNING id) INSERT INTO "LootItem" ("lootId","itemSnapshotId",hid) SELECT $1,id,id::text FROM inserted`,
      [loot.id, randomUUID()],
    );
    const ownerItems = (await run(makeUserFeed(database)(owner))).items;
    expect(ownerItems).toHaveLength(2);
    expect(new Set(ownerItems.map((item) => item.id)).size).toBe(2);
    expect(ownerItems[0]).toMatchObject({
      type: "loot",
      additionalItemsCount: 2,
    });
    if (ownerItems[0]?.type === "loot")
      expect(ownerItems[0].items).toHaveLength(3);
    expect((await run(makeUserFeed(database)(reader))).items).toHaveLength(1);
    await client.query(`UPDATE "NpcSnapshot" SET type='HERO' WHERE id=$1`, [
      npc.id,
    ]);
    expect((await run(makeUserFeed(database)(reader))).items).toEqual([]);
    await client.query(
      `UPDATE "OrganizationLootRecord" SET "archivedAt"=now() WHERE "lootId"=$1`,
      [loot.id],
    );
    expect((await run(makeUserFeed(database)(owner))).items).toEqual([]);
  });
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
          Schema.Struct({ level: Schema.Number, type: Schema.String }),
        ),
      }),
    )(JSON.parse(new TextDecoder().decode(message.content)));
    expect(payload.feedEntry).toEqual(
      (await run(makeUserFeed(database)(owner))).items[0],
    );
    expect(payload.feedEntry.version).toBe(2);
    expect(payload.sourceNpcs.map((npc) => npc.level).sort()).toEqual([
      100, 200,
    ]);
  });
  it("does not retry failed publication and keeps history until cleanup", async () => {
    const { guild, owner } = await seed();
    const id = randomUUID();
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
    const old = randomUUID();
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
    await run(makeGuildKillActivityCleanup(database)());
    expect(
      await run(
        database
          .select()
          .from(guildKillActivityTable)
          .where(eq(guildKillActivityTable.guildId, guild.id)),
      ),
    ).toEqual([]);
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
    const seen = new Set<string>();
    const published = Promise.withResolvers<void>();
    let publicationCount = 0;
    const create = makeKillCreation(
      database,
      {
        deleteByPattern: () => Effect.void,
        setNx: (key) =>
          Effect.sync(() => {
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }),
      },
      applicationLogger,
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
      npc: { id: 123, name: "Hero", lvl: 100, wt: 80 },
    };
    await run(create(owner, input));
    await published.promise;
    await run(create(owner, input));
    expect(publicationCount).toBe(1);
    const acceptedSums = await client.query(
      `SELECT "uniqueKills" FROM "GuildKillSummary" WHERE "guildId"=$1`,
      [guild.id],
    );
    expect(acceptedSums.rows).toEqual([{ uniqueKills: 1 }]);
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
        `SELECT "uniqueKills" FROM "GuildKillSummary" WHERE "guildId"=$1 AND "npcName"='FAIL_FEED_TEST'`,
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
  it("selects twenty groups after aggregation and uses the same tie order as the final feed", async () => {
    const { guild, owner } = await seed();
    await client.query(
      `INSERT INTO "GuildKillActivity" (id,"guildId",world,"npcId","npcName","npcType","npcLvl","occurredAt") SELECT $1||n,$2,'tempest',CASE WHEN n<=100 THEN 99 ELSE n-100 END,'NPC','ELITE2',100,$3 FROM generate_series(1,125)n`,
      [randomUUID(), guild.id, recent],
    );
    const feed = await run(makeUserFeed(database)(owner));
    expect(feed.items).toHaveLength(20);
    const expected = [99, ...Array.from({ length: 25 }, (_, i) => i + 1)]
      .map(
        (id) =>
          `kill:${guild.id}:tempest:${id}:${recent.toISOString().slice(0, 16).replaceAll(/[-T:]/g, "")}`,
      )
      .sort()
      .reverse()
      .slice(0, 20);
    expect(feed.items.map((item) => item.id)).toEqual(expected);
    expect(feed.items.find((item) => item.npc?.id === 99)).toMatchObject({
      type: "kill",
      count: 100,
    });
  });
  it("bounds responses and measures the query against 270k accepted rows", async () => {
    const { guild, reader, role } = await seed();
    const other = await seed();
    await client.query(
      `INSERT INTO "GuildKillActivity" (id,"guildId",world,"npcId","npcName","npcType","npcLvl","occurredAt") SELECT $1||n,CASE WHEN n<=90000 THEN $2 ELSE $3 END,'tempest',n%200,'NPC',CASE WHEN n%2=0 THEN 'ELITE2'::"NpcType" ELSE 'HERO'::"NpcType" END,100,now()-(n%86400)*interval '1 second' FROM generate_series(1,270000)n`,
      [randomUUID(), guild.id, other.guild.id],
    );
    await client.query(`ANALYZE "GuildKillActivity"`);
    const query = new PgDialect().sqlToQuery(
      userFeedSql(
        [{ guild, roles: [role] }],
        reader,
        new Date(Date.now() - 86400000).toISOString(),
      ),
    );
    const result = await client.query(
      `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${query.sql}`,
      query.params,
    );
    const explain = Schema.decodeUnknownSync(
      Schema.Array(
        Schema.Struct({
          "QUERY PLAN": Schema.Array(
            Schema.Struct({
              "Execution Time": Schema.Number,
              Plan: Schema.Unknown,
            }),
          ),
        }),
      ),
    )(result.rows)[0]?.["QUERY PLAN"][0];
    const storage = await client.query(
      `SELECT pg_total_relation_size('"GuildKillActivity"')::text AS bytes`,
    );
    process.stdout.write(
      `feed fixture270krows,90kscoped executionms ${explain?.["Execution Time"]}, storage ${JSON.stringify(storage.rows)}\n`,
    );
    const feed = await run(makeUserFeed(database)(reader));
    expect(feed.items).toHaveLength(20);
    expect(
      feed.items.every(
        (item) => item.type === "kill" && item.npc.type === "ELITE2",
      ),
    ).toBe(true);
    expect(JSON.stringify(feed).length).toBeLessThan(18000);
  }, 60_000);
});
