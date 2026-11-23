import { requireIsolatedTestDatabase } from "./isolated-test-database.js";
import { Client } from "pg";
import { refreshOrganizationLootRecordFactsSql } from "./loot-fixtures.js";
import { ManagedRuntime, Schema } from "effect";
import { Capability } from "@lootlog/schema/permissions";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  roleTable,
  memberToRoleTable,
} from "#src/database/drizzle/organization.schema";
import { guildKillActivityTable } from "#src/database/drizzle/kill-statistics.schema";

export const makeUserFeedFixture = () => {
  const client = new Client({
    connectionString: requireIsolatedTestDatabase(),
  });

  const runtime = ManagedRuntime.make(ApiDatabaseLive);

  let database: typeof ApiDatabase.Service;

  const now = new Date();

  const recent = new Date(Math.floor(now.getTime() / 60000) * 60000 - 120000);

  const run = runtime.runPromise.bind(runtime);

  const seed = async () => {
    const guildId = crypto.randomUUID(),
      owner = crypto.randomUUID(),
      reader = crypto.randomUUID();

    const [guild] = await run(
      database
        .insert(guildTable)
        .values({
          id: guildId,
          name: "Feed org",
          ownerId: owner,
          updatedAt: now,
        })
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
          id: crypto.randomUUID(),
          guildId,
          name: "Reader",
          permissions: [
            Capability.LOOTLOG_ACCESS,
            Capability.LOOTLOG_LOOTS_READ,
          ],
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
      id: crypto.randomUUID(),
      guildId,
      world: "tempest",
      npcId: 1,
      npcName: "NPC",
      npcType: "ELITE2",
      npcLvl: 100,
      npcProf: "w",
      occurredAt: recent,
      ...overrides,
    });

  const insertLoot = async (
    guildId: string,
    npc: { npcId: number; type: string; runtimeNpcId?: number },
    recordedAt: Date,
  ) => {
    const [loot] = Schema.decodeSync(
      Schema.Array(Schema.Struct({ id: Schema.Finite })),
    )(
      (
        await client.query(
          `WITH loot AS (INSERT INTO "Loot" ("uniqueId",world,"gameVersion",source,location,"updatedAt") VALUES ($1,'tempest','pl','FIGHT','map',now()) RETURNING id,world,"createdAt"),
        npc AS (INSERT INTO "NpcSnapshot" ("npcId",name,type,lvl,prof,"gameVersion") VALUES ($2,$1,$3::"NpcType",100,'WARRIOR','pl') RETURNING id),
        linked AS (INSERT INTO "LootNpc" ("lootId","npcSnapshotId","runtimeNpcId") SELECT loot.id, npc.id, $6::integer FROM loot, npc)
        INSERT INTO "OrganizationLootRecord" ("lootId","guildId","createdAt","updatedAt","lootWorld","lootCreatedAt","lootRarityMask","npcTypeMask","npcVisibility") SELECT id,$4,$5,now(),world,"createdAt",0,0,'{[-1,0)}' FROM loot RETURNING "lootId" AS id`,
          [
            crypto.randomUUID(),
            npc.npcId,
            npc.type,
            guildId,
            recordedAt,
            npc.runtimeNpcId ?? null,
          ],
        )
      ).rows,
    );

    if (!loot) throw new Error("Missing loot");
    await client.query(
      `${refreshOrganizationLootRecordFactsSql} WHERE "lootId" = $1`,
      [loot.id],
    );

    return loot.id;
  };

  const connect = async () => {
    requireIsolatedTestDatabase();
    await client.connect();
    database = await run(ApiDatabase);

    return database;
  };

  const close = async () => {
    await client.end();
    await runtime.dispose();
  };

  return { client, now, recent, run, seed, kill, insertLoot, connect, close };
};
