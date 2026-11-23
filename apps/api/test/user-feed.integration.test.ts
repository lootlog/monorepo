import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { makeUserFeedFixture } from "./user-feed-fixtures.js";
import { eq } from "drizzle-orm";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { makeUserFeed, buildUserFeedQuery } from "../src/users/user-feed.js";
import { Schema } from "effect";
import { refreshOrganizationLootRecordFactsSql } from "./loot-fixtures.js";

const fixture = makeUserFeedFixture();

const { client, recent, run, seed, kill } = fixture;

let database: typeof ApiDatabase.Service;

describe("personal Organization activity feed", () => {
  beforeAll(async () => {
    database = await fixture.connect();
  });
  afterAll(fixture.close);
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
      npc: { id: 1, lvl: 100, prof: "w" },
    });
    expect((await run(makeUserFeed(database)(reader))).items[0]?.id).toBe(
      readerFeed.items[0]?.id,
    );
    expect((await run(makeUserFeed(database)(owner))).items).toHaveLength(2);
    expect(
      (await run(makeUserFeed(database)(crypto.randomUUID()))).items,
    ).toEqual([]);
    await run(
      database
        .update(memberTable)
        .set({ active: false })
        .where(eq(memberTable.id, member.id)),
    );
    expect((await run(makeUserFeed(database)(reader))).items).toEqual([]);
  });
  it("groups only identical kill event sets and limits groups without dropping organizations", async () => {
    const { guild, owner } = await seed();
    const other = await seed();
    await run(
      database
        .update(guildTable)
        .set({ ownerId: owner })
        .where(eq(guildTable.id, other.guild.id)),
    );
    await Promise.all(
      Array.from({ length: 21 }, (_, index) => index + 1).flatMap((npcId) => [
        run(kill(guild.id, { npcId })),
        run(kill(other.guild.id, { npcId })),
      ]),
    );
    const feed = await run(makeUserFeed(database)(owner));
    expect(feed.items).toHaveLength(40);
    expect(new Set(feed.items.map((item) => item.groupKey)).size).toBe(20);

    for (const item of feed.items) {
      expect(
        feed.items.filter((candidate) => candidate.groupKey === item.groupKey),
      ).toHaveLength(2);
    }

    await run(
      kill(guild.id, {
        npcId: 100,
        occurredAt: new Date(recent.getTime() + 1000),
      }),
    );
    await run(
      kill(other.guild.id, {
        npcId: 100,
        occurredAt: new Date(recent.getTime() + 2000),
      }),
    );

    const distinct = (await run(makeUserFeed(database)(owner))).items.filter(
      (item) => item.npc?.id === 100,
    );

    expect(distinct).toHaveLength(2);
    expect(distinct[0]?.groupKey).not.toBe(distinct[1]?.groupKey);
  });
  it("selects twenty groups after aggregation and uses the same tie order as the final feed", async () => {
    const { guild, owner } = await seed();
    await client.query(
      `INSERT INTO "GuildKillActivity" (id,"guildId",world,"npcId","npcName","npcType","npcLvl","occurredAt") SELECT $1||n,$2,'tempest',CASE WHEN n<=100 THEN 99 ELSE n-100 END,'NPC','ELITE2',100,$3 FROM generate_series(1,125)n`,
      [crypto.randomUUID(), guild.id, recent],
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
      [crypto.randomUUID(), guild.id, other.guild.id],
    );
    await client.query(
      `WITH npcs AS (INSERT INTO "NpcSnapshot" ("npcId",name,type,lvl,"gameVersion") SELECT n,'NPC '||n||$2,CASE WHEN n%2=0 THEN 'ELITE2'::"NpcType" ELSE 'HERO'::"NpcType" END,100,'pl' FROM generate_series(0,199)n RETURNING id,"npcId"),
      loots AS (INSERT INTO "Loot" ("uniqueId",world,"gameVersion",source,location,"updatedAt") SELECT $2||n,'tempest','pl','FIGHT','map',now() FROM generate_series(1,30000)n RETURNING id,world,"createdAt"),
      linked AS (INSERT INTO "LootNpc" ("lootId","npcSnapshotId") SELECT loots.id, npcs.id FROM loots JOIN npcs ON npcs."npcId"=loots.id%200)
      INSERT INTO "OrganizationLootRecord" ("lootId","guildId","createdAt","updatedAt","lootWorld","lootCreatedAt","lootRarityMask","npcTypeMask","npcVisibility") SELECT id,$1,now()-(id%86400)*interval '1 second',now(),world,"createdAt",0,0,'{[-1,0)}' FROM loots`,
      [guild.id, crypto.randomUUID()],
    );
    await client.query(
      `${refreshOrganizationLootRecordFactsSql} WHERE "guildId" = $1`,
      [guild.id],
    );
    await client.query(
      `ANALYZE "GuildKillActivity"; ANALYZE "OrganizationLootRecord"; ANALYZE "LootNpc"; ANALYZE "NpcSnapshot"`,
    );

    const query = buildUserFeedQuery(
      [{ guild, roles: [role] }],
      reader,
      new Date(Date.now() - 86400000).toISOString(),
    ).toSQL();

    const result = await client.query(
      `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${query.sql}`,
      query.params,
    );

    const explain = Schema.decodeSync(
      Schema.Array(
        Schema.Struct({
          "QUERY PLAN": Schema.Array(
            Schema.Struct({
              "Execution Time": Schema.Finite,
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
      `feed fixture270krows,90kscoped,30kloots executionms ${explain?.["Execution Time"]}, storage ${JSON.stringify(storage.rows)}\n`,
    );
    const feed = await run(makeUserFeed(database)(reader));
    expect(feed.items.length).toBeGreaterThanOrEqual(20);
    expect(feed.items.length).toBeLessThanOrEqual(40);
    expect(feed.items.every((item) => item.npc?.type === "ELITE2")).toBe(true);
    expect(JSON.stringify(feed).length).toBeLessThan(60000);
  }, 60_000);
});
