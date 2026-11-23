import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { MapPlayersSnapshot } from "@lootlog/protocol/loot-summary";
import { randomInt } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  itemSnapshotTable,
  npcSnapshotTable,
  playerSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { createItemStatsHash } from "@lootlog/database/snapshot-hash";
import {
  makeLootAcceptanceFixture,
  type ApiDatabaseRuntime,
} from "./loot-acceptance-fixtures.js";

const fixture = makeLootAcceptanceFixture();

const {
  seed,
  acceptance,
  publications,
  mapPlayerLinks,
  snapshotTestLootIds,
  lootRecord,
} = fixture;

let runtime: ApiDatabaseRuntime;

let database: typeof ApiDatabase.Service;

describe("durable loot item and participant snapshots", () => {
  beforeAll(async () => {
    ({ runtime, database } = await fixture.connect());
  });

  afterEach(fixture.releaseSnapshotTestOutbox);

  afterAll(() => fixture.close());

  it("keeps each observed item name and icon on its loot and per-instance stats on the looted item", async () => {
    const { id, request } = await seed();
    const itemId = 9_000_000 + randomInt(1_000_000);
    const revisionStat = "rarity=heroic;lvl=80;contra=40";

    const [legacy] = await runtime.runPromise(
      database
        .insert(itemSnapshotTable)
        .values({
          gameVersion: "pl",
          itemId,
          statsHash: createItemStatsHash(revisionStat),
          name: "Seth's War Trophy",
          icon: "trophy.gif",
          lvl: 80,
          rarity: "HEROIC",
          statRaw: `${revisionStat};created=1`,
          statsSnapshot: {},
        })
        .returning(),
    );

    if (!legacy) throw new Error("Expected legacy item snapshot");

    const accept = async (
      item: { name: string; icon: string; instanceStat: string },
      hids = [crypto.randomUUID()],
    ) => {
      const result = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            gameVersion: "pl",
            loots: request.submission.loots.map((base, index) => ({
              ...base,
              hid: hids[index] ?? crypto.randomUUID(),
              id: itemId,
              name: item.name,
              icon: item.icon,
              stat: `${item.instanceStat};${revisionStat}`,
            })),
          },
        }),
      );

      snapshotTestLootIds.push(result.id);

      const [stored] = await runtime.runPromise(
        database
          .select({
            instanceStat: lootItemTable.instanceStat,
            snapshot: itemSnapshotTable,
          })
          .from(lootItemTable)
          .innerJoin(
            itemSnapshotTable,
            eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
          )
          .where(eq(lootItemTable.lootId, result.id)),
      );

      const search = (await publications(result.id)).find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.CATALOG_ITEMS_INDEX,
      );

      return {
        hids,
        id: result.id,
        search,
        stored,
        item: (await lootRecord(id, result.id))?.items[0],
      };
    };

    const english = await accept({
      name: "Seth's War Trophy",
      icon: "trophy.gif",
      instanceStat: "created=100;amount=1",
    });

    const polish = await accept({
      name: "Wojenne trofeum Seta",
      icon: "trophy.gif",
      instanceStat: "created=200;amount=3",
    });

    const polishAgain = await accept({
      name: "Wojenne trofeum Seta",
      icon: "trophy.gif",
      instanceStat: "created=300;amount=5;opis=Zdobyte przez Gracza",
    });

    const newIcon = await accept({
      name: "Wojenne trofeum Seta",
      icon: "trophy-v2.gif",
      instanceStat: "created=400",
    });

    expect(english.stored?.snapshot.id).not.toBe(legacy.id);
    expect(polish.stored?.snapshot.id).not.toBe(english.stored?.snapshot.id);
    expect(polishAgain.stored?.snapshot.id).toBe(polish.stored?.snapshot.id);
    expect(newIcon.stored?.snapshot.id).not.toBe(polish.stored?.snapshot.id);
    expect(polishAgain.stored?.snapshot).toMatchObject({
      name: "Wojenne trofeum Seta",
      gameVersion: "pl",
      statRaw: revisionStat,
    });
    expect(polishAgain.stored?.instanceStat).toBe(
      "created=300;amount=5;opis=Zdobyte przez Gracza",
    );

    expect(
      [english, polish, polishAgain, newIcon].map(({ item }) => [
        item?.name,
        item?.icon,
        item?.stat,
      ]),
    ).toEqual([
      [
        "Seth's War Trophy",
        "trophy.gif",
        `${revisionStat};created=100;amount=1`,
      ],
      [
        "Wojenne trofeum Seta",
        "trophy.gif",
        `${revisionStat};created=200;amount=3`,
      ],
      [
        "Wojenne trofeum Seta",
        "trophy.gif",
        `${revisionStat};created=300;amount=5;opis=Zdobyte przez Gracza`,
      ],
      ["Wojenne trofeum Seta", "trophy-v2.gif", `${revisionStat};created=400`],
    ]);
    expect(polish.search).toMatchObject({
      data: [
        {
          id: itemId,
          name: "Wojenne trofeum Seta",
          stat: revisionStat,
          gameVersion: "pl",
        },
      ],
    });

    const retry = await accept(
      {
        name: "Wojenne trofeum Seta",
        icon: "trophy.gif",
        instanceStat: "created=100;amount=1",
      },
      english.hids,
    );

    expect(retry.id).toBe(english.id);
    expect(retry.stored).toEqual(english.stored);
    expect(
      await runtime.runPromise(
        database
          .select()
          .from(itemSnapshotTable)
          .where(eq(itemSnapshotTable.id, legacy.id)),
      ),
    ).toEqual([legacy]);
  });

  it.each([1, 2])(
    "accepts concurrent loots with opposite participants, overlapping item and NPC snapshots, and the same map roster (round %j)",
    async () => {
      const first = await seed(true);
      const second = await seed(true);
      const world = `concurrent-map-${crypto.randomUUID()}`;

      const playerA = {
        accountId: randomInt(1, 1_000_000),
        characterId: randomInt(1, 1_000_000),
        name: `Player A ${crypto.randomUUID()}`,
        prof: "WARRIOR" as const,
        icon: "player-a.png",
        lvl: 281,
      };

      const playerB = {
        accountId: randomInt(1_000_001, 2_000_000),
        characterId: randomInt(1_000_001, 2_000_000),
        name: `Player B ${crypto.randomUUID()}`,
        prof: "MAGE" as const,
        icon: "player-b.png",
        lvl: 282,
      };

      const [baseItem] = first.request.submission.loots;
      const [baseNpc] = first.request.submission.npcs;

      if (!baseItem || !baseNpc) throw new Error("Expected seeded loot");

      const itemX = { ...baseItem, id: randomInt(10_000_000, 20_000_000) };
      const itemY = { ...baseItem, id: itemX.id + 1 };

      const npcP = {
        ...baseNpc,
        id: randomInt(10_000_000, 20_000_000),
        name: crypto.randomUUID(),
      };

      const npcQ = { ...npcP, id: npcP.id + 1 };

      const items = (...templates: Array<typeof itemX>) =>
        templates.map((item) => ({ ...item, hid: crypto.randomUUID() }));

      first.request.submission = {
        ...first.request.submission,
        world,
        npcs: [npcP, npcQ],
        loots: items(itemX, itemX, itemY),
        players: [{ ...playerA, id: playerA.characterId, prof: "w", lvl: 80 }],
        mapPlayersSnapshot: [playerA, playerB],
      };
      second.request.submission = {
        ...second.request.submission,
        world,
        npcs: [npcQ, npcP],
        loots: items(itemY, itemX, itemY),
        players: [{ ...playerB, id: playerB.characterId, prof: "m", lvl: 80 }],
        mapPlayersSnapshot: [playerB, playerA],
      };

      const [firstResult, secondResult] = await Promise.all(
        [first.request, second.request].map(async (request) => {
          const result = await runtime.runPromise(acceptance().accept(request));
          snapshotTestLootIds.push(result.id);

          return result;
        }),
      );

      if (!firstResult || !secondResult)
        throw new Error("Expected both accepted loots");
      expect(firstResult.id).not.toBe(secondResult.id);

      const snapshots = await runtime.runPromise(
        database
          .select()
          .from(playerSnapshotTable)
          .where(eq(playerSnapshotTable.world, world)),
      );

      expect(snapshots).toHaveLength(2);

      const itemSnapshots = await runtime.runPromise(
        database
          .select({
            id: itemSnapshotTable.id,
            itemId: itemSnapshotTable.itemId,
          })
          .from(itemSnapshotTable)
          .where(inArray(itemSnapshotTable.itemId, [itemX.id, itemY.id])),
      );

      const npcSnapshots = await runtime.runPromise(
        database
          .select({ id: npcSnapshotTable.id, npcId: npcSnapshotTable.npcId })
          .from(npcSnapshotTable)
          .where(inArray(npcSnapshotTable.npcId, [npcP.id, npcQ.id])),
      );

      expect(itemSnapshots).toHaveLength(2);
      expect(npcSnapshots).toHaveLength(2);

      const itemSnapshotId = new Map(
        itemSnapshots.map((snapshot) => [snapshot.itemId, snapshot.id]),
      );

      const npcSnapshotId = new Map(
        npcSnapshots.map((snapshot) => [snapshot.npcId, snapshot.id]),
      );

      for (const [request, result] of [
        [first.request, firstResult],
        [second.request, secondResult],
      ] as const) {
        const lootItems = await runtime.runPromise(
          database
            .select({
              hid: lootItemTable.hid,
              itemSnapshotId: lootItemTable.itemSnapshotId,
            })
            .from(lootItemTable)
            .where(eq(lootItemTable.lootId, result.id))
            .orderBy(lootItemTable.id),
        );

        const lootNpcs = await runtime.runPromise(
          database
            .select({ npcSnapshotId: lootNpcTable.npcSnapshotId })
            .from(lootNpcTable)
            .where(eq(lootNpcTable.lootId, result.id))
            .orderBy(lootNpcTable.id),
        );

        expect(lootItems).toEqual(
          request.submission.loots.map((item) => ({
            hid: item.hid,
            itemSnapshotId: itemSnapshotId.get(item.id)!,
          })),
        );
        expect(lootNpcs).toEqual(
          request.submission.npcs.map((npc) => ({
            npcSnapshotId: npcSnapshotId.get(npc.id)!,
          })),
        );
      }

      const snapshotA = snapshots.find(
        (player) => player.characterId === playerA.characterId,
      );

      const snapshotB = snapshots.find(
        (player) => player.characterId === playerB.characterId,
      );

      if (!snapshotA || !snapshotB)
        throw new Error("Expected both player snapshots");
      await Promise.all(
        (
          [
            [first.id, firstResult, snapshotA],
            [second.id, secondResult, snapshotB],
          ] as const
        ).map(async ([guildId, result, participant]) => {
          const links = await mapPlayerLinks(guildId, result.id);
          expect(links).toHaveLength(2);
          expect(new Set(links.map((link) => link.playerSnapshotId))).toEqual(
            new Set([snapshotA.id, snapshotB.id]),
          );

          const participants = await runtime.runPromise(
            database
              .select()
              .from(lootPlayerTable)
              .where(eq(lootPlayerTable.lootId, result.id)),
          );

          expect(participants).toHaveLength(1);
          expect(participants[0]?.playerSnapshotId).toBe(participant.id);
          expect(
            (await lootRecord(guildId, result.id))?.mapPlayersSnapshot,
          ).toEqual([playerA, playerB]);
        }),
      );
    },
  );

  it.each([false, true])(
    "reuses participant snapshots across scoped Organization links (legacy CLI snapshot: %j)",
    async (legacySnapshot) => {
      const first = await seed(true);
      const second = await seed(true);

      const observers: MapPlayersSnapshot = [
        {
          accountId: 123,
          characterId: 456,
          name: "Player",
          prof: "WARRIOR",
          icon: "player.png",
          lvl: 283,
        },
      ];

      first.request.submission = {
        ...first.request.submission,
        world: `outbox-test-${first.id}`,
        mapPlayersSnapshot: observers,
      };
      let legacySnapshotId: number | undefined;

      if (legacySnapshot) {
        const player = observers[0];

        if (!player) throw new Error("Expected map observer");

        const inserted = await runtime.runPromise(
          database
            .insert(playerSnapshotTable)
            .values({
              ...player,
              world: first.request.submission.world,
              snapshotHash: new Bun.CryptoHasher("sha256")
                .update(`${player.name}${player.prof}${player.icon}`)
                .digest("hex"),
            })
            .returning(),
        );

        legacySnapshotId = inserted[0]?.id;
        expect(legacySnapshotId).toBeDefined();
      }

      const result = await runtime.runPromise(
        acceptance().accept(first.request),
      );

      snapshotTestLootIds.push(result.id);
      second.request.submission = first.request.submission;
      await runtime.runPromise(acceptance().accept(second.request));

      const participants = await runtime.runPromise(
        database
          .select()
          .from(lootPlayerTable)
          .where(eq(lootPlayerTable.lootId, result.id)),
      );

      expect(participants).toHaveLength(1);
      const participant = participants[0];

      if (!participant) throw new Error("Expected fight participant");

      if (legacySnapshot)
        expect(participant.playerSnapshotId).toBe(legacySnapshotId!);
      const firstLinks = await mapPlayerLinks(first.id, result.id);
      const secondLinks = await mapPlayerLinks(second.id, result.id);
      expect(firstLinks).toHaveLength(1);
      expect(secondLinks).toHaveLength(1);
      expect(firstLinks[0]?.playerSnapshotId).toBe(
        participant.playerSnapshotId,
      );
      expect(secondLinks[0]?.playerSnapshotId).toBe(
        participant.playerSnapshotId,
      );
      expect(firstLinks[0]?.organizationLootRecordId).not.toBe(
        secondLinks[0]?.organizationLootRecordId,
      );
      expect(
        await runtime.runPromise(
          database
            .select()
            .from(playerSnapshotTable)
            .where(
              eq(playerSnapshotTable.world, first.request.submission.world),
            ),
        ),
      ).toHaveLength(1);
      expect(
        (await lootRecord(first.id, result.id))?.mapPlayersSnapshot,
      ).toEqual(observers);
      expect(
        (await lootRecord(second.id, result.id))?.mapPlayersSnapshot,
      ).toEqual(observers);
    },
  );
});
