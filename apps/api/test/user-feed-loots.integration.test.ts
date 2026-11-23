import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { makeUserFeedFixture } from "./user-feed-fixtures.js";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Schema } from "effect";
import { guildTable } from "#src/database/drizzle/organization.schema";
import {
  makeUserFeed,
  readPublishedFeedEntry,
} from "../src/users/user-feed.js";
import type { UserFeedQuery } from "#src/contracts/users/feed-schemas";
import { refreshOrganizationLootRecordFactsSql } from "./loot-fixtures.js";

const fixture = makeUserFeedFixture();

const { client, recent, run, seed, kill, insertLoot } = fixture;

let database: typeof ApiDatabase.Service;

describe("personal Organization activity feed loots", () => {
  beforeAll(async () => {
    database = await fixture.connect();
  });
  afterAll(fixture.close);
  it("includes separate nonarchived loot records, requiring visibility of every NPC and bounding item previews", async () => {
    const { guild, owner, reader } = await seed();
    const other = await seed();
    await run(
      database
        .update(guildTable)
        .set({ ownerId: owner })
        .where(eq(guildTable.id, other.guild.id)),
    );

    const loot = Schema.decodeSync(
      Schema.Array(Schema.Struct({ id: Schema.Finite })),
    )(
      (
        await client.query(
          `INSERT INTO "Loot" ("uniqueId",world,"gameVersion",source,location,"updatedAt") VALUES ($1,'tempest','pl','FIGHT','map',now()) RETURNING id`,
          [randomUUID()],
        )
      ).rows,
    )[0];

    if (!loot) throw new Error("Missing loot");
    await client.query(
      `INSERT INTO "OrganizationLootRecord" ("lootId","guildId","updatedAt","lootWorld","lootCreatedAt","lootRarityMask","npcTypeMask","npcVisibility")
       SELECT "Loot".id,g,now(),"Loot".world,"Loot"."createdAt",0,0,'{[-1,0)}'
       FROM "Loot", unnest(ARRAY[$2,$3]) AS g WHERE "Loot".id = $1`,
      [loot.id, guild.id, other.guild.id],
    );

    const npc = Schema.decodeSync(
      Schema.Array(Schema.Struct({ id: Schema.Finite })),
    )(
      (
        await client.query(
          `INSERT INTO "NpcSnapshot" ("npcId",name,type,lvl,prof,"gameVersion") VALUES (1,$1,'ELITE2',100,'WARRIOR','pl') RETURNING id`,
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
      `WITH inserted AS (INSERT INTO "ItemSnapshot" ("itemId","statsHash",name,icon,"statRaw","statsSnapshot","itemType",lvl,"gameVersion") SELECT n,$2||n,'item','item.png','lvl=100;sa=10','{}'::jsonb,'Sword',100,'pl' FROM generate_series(1,5)n RETURNING id) INSERT INTO "LootItem" ("lootId","itemSnapshotId",hid,"instanceStat") SELECT $1,id,id::text,'amount=3' FROM inserted`,
      [loot.id, randomUUID()],
    );
    await client.query(
      `WITH inserted AS (INSERT INTO "PlayerSnapshot" (world,"accountId","characterId","snapshotHash",name,prof,icon) VALUES ('tempest',1,2,$2,'Participant','WARRIOR','player.png') RETURNING id) INSERT INTO "LootPlayer" ("lootId","playerSnapshotId",lvl,hpp) SELECT $1,id,120,75 FROM inserted`,
      [loot.id, randomUUID()],
    );
    await client.query(
      `${refreshOrganizationLootRecordFactsSql} WHERE "guildId" = $1`,
      [guild.id],
    );
    await client.query(
      `UPDATE "Loot" SET "lootShare"='{"Participant":["1"]}'::jsonb WHERE id=$1`,
      [loot.id],
    );
    const ownerItems = (await run(makeUserFeed(database)(owner))).items;
    expect(ownerItems).toHaveLength(2);
    expect(new Set(ownerItems.map((item) => item.id)).size).toBe(2);
    expect(ownerItems[0]).toMatchObject({
      type: "loot",
      additionalItemsCount: 2,
      npc: { prof: "WARRIOR" },
    });

    if (ownerItems[0]?.type === "loot") {
      expect(ownerItems[0].items).toHaveLength(3);
      expect(ownerItems[0].summary?.items).toHaveLength(5);
      expect(ownerItems[0].summary).toMatchObject({
        location: "map",
        players: [
          {
            id: "21",
            name: "Participant",
            prof: "WARRIOR",
            icon: "player.png",
            lvl: 120,
            hpp: 75,
            accountId: 1,
            characterId: 2,
          },
        ],
        npcs: [{ id: 1, type: "ELITE2", lvl: 100 }],
        lootShare: { Participant: ["1"] },
      });
      expect(ownerItems[0].summary?.items[0]).toMatchObject({
        stat: "lvl=100;sa=10;amount=3",
        type: "Sword",
        lvl: 100,
        prof: expect.arrayContaining(["WARRIOR"]),
      });

      const published = await run(
        readPublishedFeedEntry(database, ownerItems[0].guild.id, {
          lootId: loot.id,
        }),
      );

      expect(published).toEqual(ownerItems[0]);
      expect(ownerItems[0].items[0]).toMatchObject({
        stat: "lvl=100;sa=10;amount=3",
        type: "Sword",
        lvl: 100,
      });
    }

    expect(ownerItems[0]?.groupKey).toBe(ownerItems[1]?.groupKey);
    expect((await run(makeUserFeed(database)(reader))).items).toHaveLength(1);
    await client.query(`UPDATE "NpcSnapshot" SET type='HERO' WHERE id=$1`, [
      npc.id,
    ]);
    await client.query(
      `${refreshOrganizationLootRecordFactsSql} WHERE "guildId" = $1`,
      [guild.id],
    );
    expect((await run(makeUserFeed(database)(reader))).items).toEqual([]);
    await client.query(
      `UPDATE "OrganizationLootRecord" SET "archivedAt"=now() WHERE "lootId"=$1`,
      [loot.id],
    );
    expect((await run(makeUserFeed(database)(owner))).items).toEqual([]);
  });
  it("links a loot to its NPC kill, filters linked groups together and counts each pair once", async () => {
    const { guild, owner } = await seed();
    const lootAt = (offset: number) => new Date(recent.getTime() + offset);
    await run(kill(guild.id, { npcId: 7, npcType: "HERO" }));

    const linkedLoot = await insertLoot(
      guild.id,
      { npcId: 7, type: "HERO" },
      lootAt(5000),
    );

    const lateLoot = await insertLoot(
      guild.id,
      { npcId: 7, type: "HERO" },
      lootAt(10 * 60000),
    );

    await run(kill(guild.id, { npcId: 9, npcType: "ELITE2" }));

    const feed = (query: UserFeedQuery = {}) =>
      run(makeUserFeed(database)(owner, query)).then(({ items }) =>
        items.map((item) =>
          item.type === "kill" ? `kill:${item.npc.id}` : `loot:${item.lootId}`,
        ),
      );

    expect(await feed({ withLootOnly: true })).toEqual(
      expect.arrayContaining([
        "kill:7",
        `loot:${linkedLoot}`,
        `loot:${lateLoot}`,
      ]),
    );
    expect(await feed({ withLootOnly: true })).not.toContain("kill:9");
    expect(await feed({ excludedNpcCategories: ["HERO"] })).toEqual(["kill:9"]);
    expect(await feed({ excludedGuildIds: [guild.id] })).toEqual([]);

    await run(kill(guild.id, { npcId: 11, npcType: "HERO" }));

    const templateLoot = await insertLoot(
      guild.id,
      { npcId: 257_636, runtimeNpcId: 11, type: "HERO" },
      lootAt(5000),
    );

    expect(await feed({ withLootOnly: true })).toEqual(
      expect.arrayContaining(["kill:11", `loot:${templateLoot}`]),
    );

    const busy = await seed();

    for (let npcId = 100; npcId < 121; npcId += 1) {
      await run(
        kill(busy.guild.id, {
          npcId,
          occurredAt: new Date(recent.getTime() + npcId * 1000),
        }),
      );
      await insertLoot(
        busy.guild.id,
        { npcId, type: "ELITE2" },
        new Date(recent.getTime() + npcId * 1000 + 3000),
      );
    }

    const pairs = await run(makeUserFeed(database)(busy.owner));
    expect(pairs.items).toHaveLength(40);
    expect(new Set(pairs.items.map((item) => item.npc?.id))).not.toContain(100);
  });
  it("names a loot after its boss, not an escort of a higher level", async () => {
    const { guild, owner } = await seed();
    await run(kill(guild.id, { npcId: 21, npcType: "ELITE2", npcLvl: 50 }));

    const [loot] = Schema.decodeSync(
      Schema.Array(Schema.Struct({ id: Schema.Finite })),
    )(
      (
        await client.query(
          `WITH loot AS (INSERT INTO "Loot" ("uniqueId",world,"gameVersion",source,location,"updatedAt") VALUES ($1,'tempest','pl','FIGHT','map',now()) RETURNING id,world,"createdAt"),
          npc AS (INSERT INTO "NpcSnapshot" ("npcId",name,type,lvl,wt,prof,"gameVersion") VALUES (21,$1 || 'boss','ELITE2',50,25,'WARRIOR','pl'), (22,$1 || 'escort','ELITE',70,15,'WARRIOR','pl') RETURNING id),
          linked AS (INSERT INTO "LootNpc" ("lootId","npcSnapshotId") SELECT loot.id, npc.id FROM loot, npc)
          INSERT INTO "OrganizationLootRecord" ("lootId","guildId","createdAt","updatedAt","lootWorld","lootCreatedAt","lootRarityMask","npcTypeMask","npcVisibility") SELECT id,$2,$3,now(),world,"createdAt",0,0,'{[-1,0)}' FROM loot RETURNING "lootId" AS id`,
          [randomUUID(), guild.id, new Date(recent.getTime() + 5000)],
        )
      ).rows,
    );

    if (!loot) throw new Error("Missing loot");
    await client.query(
      `${refreshOrganizationLootRecordFactsSql} WHERE "guildId" = $1`,
      [guild.id],
    );

    const feed = (query: UserFeedQuery = {}) =>
      run(makeUserFeed(database)(owner, query)).then(({ items }) =>
        items.map((item) =>
          item.type === "kill" ? `kill:${item.npc.id}` : `loot:${item.lootId}`,
        ),
      );

    expect(await feed({ withLootOnly: true })).toEqual(
      expect.arrayContaining(["kill:21", `loot:${loot.id}`]),
    );
    expect(await feed({ excludedNpcCategories: ["ELITE2"] })).toEqual([]);
  });
});
