import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import {
  NullableLootResponse,
  LootResponse as RuntimeLootResponse,
} from "#src/loots/loot-response.schema";
import {
  LootDetailResponse,
  LootResponse,
  type CreateLootRequest,
} from "#src/contracts/loots/schemas";
import { Capability } from "@lootlog/schema/permissions";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.repository";
import type { MapPlayersSnapshot } from "@lootlog/protocol/loot-summary";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { Effect, ManagedRuntime, Schema } from "effect";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import { lootPublicationOutboxTable } from "#src/database/drizzle/loot-publication-outbox.schema";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import {
  lootlogConfigTable,
  lootlogConfigNpcTable,
  lootNpcTable,
  npcSnapshotTable,
  lootMapPlayerTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/user.schema";
import { makeLootSubmissionAcceptancePersistence } from "#src/loots/submission/loot-submission-acceptance.repository";
import { makeLootSubmissionAcceptance } from "#src/loots/submission/loot-submission-acceptance.service";
import { LootPublicationPayload } from "#src/loots/submission/loot-publication-outbox";

const makeRuntime = () => ManagedRuntime.make(ApiDatabaseLive);

export type ApiDatabaseRuntime = ReturnType<typeof makeRuntime>;

export const mapPlayersSnapshot: MapPlayersSnapshot = [
  {
    accountId: 123,
    characterId: 456,
    name: "Map observer",
    prof: "WARRIOR",
    icon: null,
    lvl: 280,
  },
];

export const makeLootAcceptanceFixture = () => {
  let runtime = makeRuntime();
  let database: typeof ApiDatabase.Service;

  const connect = async () => {
    database = await runtime.runPromise(ApiDatabase);

    return { runtime, database };
  };

  const restart = async () => {
    await runtime.dispose();
    runtime = makeRuntime();

    return connect();
  };

  const close = () => runtime.dispose();

  const seed = async (elite2 = false) => {
    const id = randomUUID();
    const now = new Date();
    await runtime.runPromise(
      Effect.gen(function* () {
        yield* database
          .insert(guildTable)
          .values({ id, name: "Outbox test", ownerId: id, updatedAt: now });
        yield* database.insert(memberTable).values({
          userId: id,
          guildId: id,
          globalUserId: id,
          name: "Player",
          updatedAt: now,
        });
        yield* database
          .insert(lootlogConfigTable)
          .values({ id, updatedAt: now });
        yield* database.insert(lootlogConfigNpcTable).values({
          lootlogConfigId: id,
          npcType: elite2 ? "ELITE2" : "HERO",
          allowedRarities: ["HEROIC", "LEGENDARY"],
          updatedAt: now,
        });
        yield* database.insert(userCharactersLootlogSettingsTable).values({
          userId: id,
          accountId: "123",
          characterId: "456",
          catchingGuildIds: [id],
          updatedAt: now,
        });
      }),
    );

    const submission: CreateLootRequest = {
      loots: [
        {
          hid: id,
          id: 8234567,
          name: "Test item",
          icon: "item.png",
          pr: 1,
          prc: "1",
          cl: 1,
          stat: elite2 ? "rarity=legendary;lvl=80" : "rarity=heroic;lvl=80",
        },
      ],
      npcs: [
        {
          id: 8234568,
          name: "Test hero",
          location: "Test map",
          lvl: 80,
          prof: "w",
          wt: elite2 ? 25 : 85,
          icon: "npc.png",
          type: 2,
        },
      ],
      players: [
        {
          id: 456,
          accountId: 123,
          name: "Player",
          lvl: 80,
          prof: "w",
          icon: "player.png",
        },
      ],
      world: "outbox-test",
      gameVersion: "pl",
      source: "FIGHT",
      location: "Test map",
      accountId: "123",
      characterId: "456",
    };

    return { id, request: { discordId: id, submission } };
  };

  const acceptance = (signalPublications: Effect.Effect<void> = Effect.void) =>
    makeLootSubmissionAcceptance(
      makeLootSubmissionAcceptancePersistence(database),
      {
        withLock: (_resource, _ttl, _options, effect) => effect,
      },
      signalPublications,
    );

  const pending = (lootId: number) =>
    runtime.runPromise(
      database
        .select()
        .from(lootPublicationOutboxTable)
        .where(eq(lootPublicationOutboxTable.lootId, lootId)),
    );

  const npcSnapshots = (lootId: number) =>
    runtime.runPromise(
      database
        .select({ npc: npcSnapshotTable })
        .from(lootNpcTable)
        .innerJoin(
          npcSnapshotTable,
          eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
        )
        .where(eq(lootNpcTable.lootId, lootId))
        .orderBy(lootNpcTable.id),
    );

  const publications = async (lootId: number) =>
    (await pending(lootId)).map(({ payload }) =>
      Schema.decodeUnknownSync(LootPublicationPayload)(payload),
    );

  const mapPlayerLinks = (guildId: string, lootId: number) =>
    runtime.runPromise(
      database
        .select({
          organizationLootRecordId: lootMapPlayerTable.organizationLootRecordId,
          playerSnapshotId: lootMapPlayerTable.playerSnapshotId,
        })
        .from(lootMapPlayerTable)
        .innerJoin(
          organizationLootRecordTable,
          eq(
            organizationLootRecordTable.id,
            lootMapPlayerTable.organizationLootRecordId,
          ),
        )
        .where(
          and(
            eq(organizationLootRecordTable.guildId, guildId),
            eq(organizationLootRecordTable.lootId, lootId),
          ),
        )
        .orderBy(lootMapPlayerTable.playerSnapshotId),
    );

  const snapshotTestLootIds: number[] = [];

  const releaseSnapshotTestOutbox = async () => {
    if (snapshotTestLootIds.length === 0) return;
    await runtime.runPromise(
      database
        .delete(lootPublicationOutboxTable)
        .where(
          inArray(lootPublicationOutboxTable.lootId, [...snapshotTestLootIds]),
        ),
    );
    snapshotTestLootIds.length = 0;
  };

  const seededGuild = async (guildId: string) => {
    const [guild] = await runtime.runPromise(
      database.select().from(guildTable).where(eq(guildTable.id, guildId)),
    );

    if (!guild) throw new Error("Expected seeded Organization");

    return guild;
  };

  const lootRecord = async (
    guildId: string,
    lootId: number,
    permissions: Capability[] = [Capability.OWNER],
  ) => {
    const guild = await seededGuild(guildId);

    const loot = await runtime.runPromise(
      makeLootQueryOperations(makeLootQueryPersistence(database)).fetchLootById(
        guild,
        permissions,
        [],
        lootId,
      ),
    );

    return Schema.decodeSync(LootDetailResponse)(
      Schema.encodeSync(NullableLootResponse)(loot),
    );
  };

  const lootList = async (guildId: string) => {
    const guild = await seededGuild(guildId);

    const loots = await runtime.runPromise(
      makeLootQueryOperations(
        makeLootQueryPersistence(database),
      ).fetchLootsByGuildId(guild, [Capability.OWNER], [], {}),
    );

    return Schema.decodeSync(Schema.Array(LootResponse))(
      Schema.encodeSync(Schema.Array(RuntimeLootResponse))(loots),
    );
  };

  return {
    connect,
    restart,
    close,
    seed,
    acceptance,
    pending,
    npcSnapshots,
    publications,
    mapPlayerLinks,
    snapshotTestLootIds,
    releaseSnapshotTestOutbox,
    seededGuild,
    lootRecord,
    lootList,
  };
};
