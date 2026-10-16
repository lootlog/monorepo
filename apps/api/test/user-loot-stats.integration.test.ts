import { requireIsolatedTestDatabase } from "./isolated-test-database.js";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { ManagedRuntime, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import { makeUserLootStats } from "#src/loots/query/user-loot-stats";
import { getStableNpcId } from "#src/shared/margonem/stable-npc-id";

const client = new Client({ connectionString: requireIsolatedTestDatabase() });

const runtime = ManagedRuntime.make(ApiDatabaseLive);

let database: typeof ApiDatabase.Service;

const Ids = Schema.Array(Schema.Struct({ id: Schema.Number }));

const one = async (sql: string, values: unknown[]) => {
  const [row] = Schema.decodeUnknownSync(Ids)(
    (await client.query(sql, values)).rows,
  );

  if (!row) throw new Error("Missing fixture row");

  return row.id;
};

/** An Organization whose member reads loots of NPCs up to level 150, titans excepted. */
const organization = async (user: string) => {
  const guildId = randomUUID(),
    roleId = randomUUID();

  await client.query(
    `INSERT INTO "Guild" (id,name,"ownerId","updatedAt") VALUES ($1,'Org',$2,now())`,
    [guildId, randomUUID()],
  );

  const memberId = await one(
    `INSERT INTO "Member" ("userId","guildId",name,"globalUserId","updatedAt") VALUES ($1,$2,'Member',$1,now()) RETURNING id`,
    [user, guildId],
  );

  await client.query(
    `INSERT INTO "Role" (id,"guildId",name,permissions,"lvlRangeFrom","lvlRangeTo","updatedAt") VALUES ($1,$2,'Reader',$3::"Permission"[],0,150,now())`,
    [
      roleId,
      guildId,
      [
        Permission.LOOTLOG_ACCESS,
        Permission.LOOTLOG_LOOTS_READ,
        Permission.LOOTLOG_LOOTS_HEROES_READ,
      ],
    ],
  );
  await client.query(`INSERT INTO "_MemberToRole" ("A","B") VALUES ($1,$2)`, [
    memberId,
    roleId,
  ]);

  return guildId;
};

/** A HERO loot with one legendary item, a fight of the given character. */
const loot = async (options: {
  guildIds: string[];
  characterId: number;
  /** The character's name in the fight. */
  name?: string;
  npc?: { type?: string; lvl?: number };
  world?: string;
  archived?: boolean;
  /** Another character fought too. */
  party?: boolean;
  /** The loot share gives the item to the character. */
  shared?: boolean;
  /** An older Game client reported the template id, not the spawn id. */
  legacy?: boolean;
  /** A dialog reward rather than a fight's loot. */
  dialog?: boolean;
}) => {
  const world = options.world ?? "tempest";

  const lootId = await one(
    `INSERT INTO "Loot" ("uniqueId",world,"gameVersion",source,location,"createdAt","updatedAt") VALUES ($1,$2,'pl',$3::"LootSource",'map',now(),now()) RETURNING id`,
    [randomUUID(), world, options.dialog ? "DIALOG" : "FIGHT"],
  );

  for (const guildId of options.guildIds)
    await client.query(
      `INSERT INTO "OrganizationLootRecord" ("lootId","guildId","archivedAt","updatedAt") VALUES ($1,$2,$3,now())`,
      [lootId, guildId, options.archived ? new Date() : null],
    );

  await client.query(
    `WITH npc AS (INSERT INTO "NpcSnapshot" ("npcId",name,type,lvl,"gameVersion") VALUES (7,'Hero',$2::"NpcType",$3,'pl') RETURNING id)
    INSERT INTO "LootNpc" ("lootId","npcSnapshotId","runtimeNpcId") SELECT $1,id,$4::integer FROM npc`,
    [
      lootId,
      options.npc?.type ?? "HERO",
      options.npc?.lvl ?? 100,
      options.legacy ? null : 77,
    ],
  );
  const hid = randomUUID();

  await client.query(
    `WITH item AS (INSERT INTO "ItemSnapshot" ("itemId","statsHash",name,icon,"statRaw","statsSnapshot","itemType",lvl,rarity,"gameVersion") VALUES (9,$2,'Legend','legend.png','','{}'::jsonb,'Sword',100,'LEGENDARY','pl') RETURNING id)
    INSERT INTO "LootItem" ("lootId","itemSnapshotId",hid) SELECT $1,id,$2 FROM item`,
    [lootId, hid],
  );
  await client.query(
    `WITH player AS (INSERT INTO "PlayerSnapshot" (world,"accountId","characterId","snapshotHash",name) VALUES ($2,1,$3,$4,$5) RETURNING id)
    INSERT INTO "LootPlayer" ("lootId","playerSnapshotId") SELECT $1,id FROM player`,
    [
      lootId,
      world,
      options.characterId,
      randomUUID(),
      options.name ?? "Hunter",
    ],
  );

  if (options.party)
    await client.query(
      `WITH player AS (INSERT INTO "PlayerSnapshot" (world,"accountId","characterId","snapshotHash",name) VALUES ($2,2,$3,$4,'Partner') RETURNING id)
      INSERT INTO "LootPlayer" ("lootId","playerSnapshotId") SELECT $1,id FROM player`,
      [lootId, world, nextCharacterId++, randomUUID()],
    );

  if (options.shared)
    // Share keys are the character id followed by the account id.
    await client.query(`UPDATE "Loot" SET "lootShare"=$2::jsonb WHERE id=$1`, [
      lootId,
      JSON.stringify({ [`${options.characterId}1`]: [hid] }),
    ]);

  return lootId;
};

let nextCharacterId = 1000;

const registerCharacter = (user: string, characterId: number) =>
  client.query(
    `INSERT INTO "UserCharactersLootlogSettings" ("userId","accountId","characterId","updatedAt") VALUES ($1,'1',$2,now())`,
    [user, String(characterId)],
  );

const stats = (
  user: string,
  query: { world?: string; characterId?: string } = {},
) =>
  runtime.runPromise(makeUserLootStats(database)(user, { days: 7, ...query }));

describe("personal loot statistics", () => {
  beforeAll(async () => {
    await client.connect();
    database = await runtime.runPromise(ApiDatabase);
  });
  afterAll(async () => {
    await client.end();
    await runtime.dispose();
  });

  it("counts each fight of the user's characters once, only as their Organizations let them see it", async () => {
    const user = randomUUID();
    const character = nextCharacterId++;
    const stranger = nextCharacterId++;
    const first = await organization(user);
    const second = await organization(user);
    const foreign = await organization(randomUUID());
    await registerCharacter(user, character);

    // Counted once although both Organizations hold it.
    await loot({ guildIds: [first, second], characterId: character });
    // Only an Organization the user is not in holds it.
    await loot({ guildIds: [foreign], characterId: character });
    // Their role hides titans and NPCs above level 150.
    await loot({
      guildIds: [first],
      characterId: character,
      npc: { type: "TITAN" },
    });
    await loot({
      guildIds: [first],
      characterId: character,
      npc: { lvl: 200 },
    });
    await loot({ guildIds: [first], characterId: character, archived: true });
    // A dialog reward lists the player but is no fight.
    await loot({ guildIds: [first], characterId: character, dialog: true });
    // Someone else's fight.
    await loot({ guildIds: [first], characterId: stranger });

    const result = await stats(user);

    expect(result.overview).toMatchObject({
      totalLoots: 1,
      totalItems: 1,
      legendaryItems: 1,
    });
    expect(result.legends).toEqual([
      expect.objectContaining({ name: "Legend", count: 1 }),
    ]);
    expect(result.topNpcs).toEqual([
      expect.objectContaining({ name: "Hero", count: 1 }),
    ]);
    expect((await stats(randomUUID())).overview.totalLoots).toBe(0);
  });

  it("narrows to one character on its world", async () => {
    const user = randomUUID();
    const main = nextCharacterId++;
    const alt = nextCharacterId++;
    const guildId = await organization(user);
    await registerCharacter(user, main);
    await registerCharacter(user, alt);
    await loot({ guildIds: [guildId], characterId: main });
    await loot({ guildIds: [guildId], characterId: alt, world: "aldous" });

    expect((await stats(user)).overview.totalLoots).toBe(2);
    expect(
      (await stats(user, { world: "tempest", characterId: String(main) }))
        .overview.totalLoots,
    ).toBe(1);
    expect(
      (await stats(user, { world: "tempest", characterId: String(alt) }))
        .overview.totalLoots,
    ).toBe(0);
  });

  it("counts as caught what the loot share gives the user's character or a solo fight leaves them, naming that character, beside their kills of the monster", async () => {
    const user = randomUUID();
    const character = nextCharacterId++;
    const archer = nextCharacterId++;
    const guildId = await organization(user);
    await registerCharacter(user, character);
    await registerCharacter(user, archer);

    await loot({ guildIds: [guildId], characterId: character });
    await loot({
      guildIds: [guildId],
      characterId: archer,
      name: "Archer",
      party: true,
      shared: true,
    });
    // A partner may have taken it; nothing says the user did.
    await loot({ guildIds: [guildId], characterId: character, party: true });
    await client.query(
      `INSERT INTO "UserKillBucket" ("periodStart","discordUserId",world,"npcId","npcName","npcType","npcLvl",kills,"lastKilledAt") VALUES (now(),$1,'tempest',77,'Hero','HERO',100,30,now())`,
      [user],
    );

    const all = await stats(user);

    expect(all.overview).toMatchObject({
      legendaryItems: 3,
      caughtLegendaryItems: 2,
    });
    expect(all.legends).toEqual([
      expect.objectContaining({
        name: "Legend",
        world: "tempest",
        npc: expect.objectContaining({ id: 77, name: "Hero" }),
        count: 3,
        caught: 2,
        caughtBy: [
          { characterId: String(archer), name: "Archer", caught: 1 },
          { characterId: String(character), name: "Hunter", caught: 1 },
        ],
        npcKills: 30,
      }),
    ]);
  });

  it("sets a colossus legend against the kills recorded under its stable id", async () => {
    const user = randomUUID();
    const character = nextCharacterId++;
    const guildId = await organization(user);
    await registerCharacter(user, character);
    await loot({
      guildIds: [guildId],
      characterId: character,
      npc: { type: "COLOSSUS" },
    });
    await client.query(
      `INSERT INTO "UserKillBucket" ("periodStart","discordUserId",world,"npcId","npcName","npcType","npcLvl",kills,"lastKilledAt") VALUES (now(),$1,'tempest',$2,'Hero','COLOSSUS',100,12,now())`,
      [user, getStableNpcId(77, "Hero", "COLOSSUS")],
    );

    await client.query(
      `INSERT INTO "UserKillBucket" ("periodStart","discordUserId",world,"npcId","npcName","npcType","npcLvl",kills,"lastKilledAt") VALUES (now(),$1,'tempest',5,'Unlucky','ELITE2',100,40,now())`,
      [user],
    );

    const result = await stats(user);

    expect(result.legends).toEqual([expect.objectContaining({ npcKills: 12 })]);
    // A boss killed without a single legend still shows, as Margonem lists it.
    expect(result.monsters).toEqual([
      expect.objectContaining({
        npc: expect.objectContaining({ name: "Unlucky" }),
        kills: 40,
        legends: 0,
        caught: 0,
      }),
      expect.objectContaining({
        npc: expect.objectContaining({
          id: getStableNpcId(77, "Hero", "COLOSSUS"),
        }),
        kills: 12,
        legends: 1,
        caught: 1,
      }),
    ]);
  });

  it("counts a legend reported by template id with the same monster's kills", async () => {
    const user = randomUUID();
    const character = nextCharacterId++;
    const guildId = await organization(user);
    await registerCharacter(user, character);
    await loot({ guildIds: [guildId], characterId: character });
    await loot({ guildIds: [guildId], characterId: character, legacy: true });
    await client.query(
      `INSERT INTO "UserKillBucket" ("periodStart","discordUserId",world,"npcId","npcName","npcType","npcLvl",kills,"lastKilledAt") VALUES (now(),$1,'tempest',77,'Hero','HERO',100,50,now())`,
      [user],
    );

    const result = await stats(user);

    expect(result.legends).toEqual([
      expect.objectContaining({
        count: 2,
        npcKills: 50,
        npc: expect.objectContaining({ id: 77 }),
      }),
    ]);
    expect(result.monsters).toEqual([
      expect.objectContaining({ kills: 50, legends: 2 }),
    ]);
  });

  it("lists a non-boss that dropped a legend only on the world it dropped it", async () => {
    const user = randomUUID();
    const character = nextCharacterId++;
    const guildId = await organization(user);
    await registerCharacter(user, character);
    await loot({
      guildIds: [guildId],
      characterId: character,
      npc: { type: "ELITE" },
    });
    await client.query(
      `INSERT INTO "UserKillBucket" ("periodStart","discordUserId",world,"npcId","npcName","npcType","npcLvl",kills,"lastKilledAt") VALUES (now(),$1,'tempest',77,'Hero','ELITE',100,7,now()),(now(),$1,'aldous',77,'Hero','ELITE',100,9,now())`,
      [user],
    );

    expect((await stats(user)).monsters).toEqual([
      expect.objectContaining({ world: "tempest", kills: 7, legends: 1 }),
    ]);
  });
});
