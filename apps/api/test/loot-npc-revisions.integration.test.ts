import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { CreateLootRequest } from "#src/contracts/loots/schemas";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  lootlogConfigNpcTable,
  lootTable,
  lootNpcTable,
  npcSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import {
  makeLootAcceptanceFixture,
  type ApiDatabaseRuntime,
} from "./loot-acceptance-fixtures.js";

const fixture = makeLootAcceptanceFixture();

const {
  seed,
  acceptance,
  npcSnapshots,
  publications,
  snapshotTestLootIds,
  lootRecord,
  lootList,
} = fixture;

let runtime: ApiDatabaseRuntime;

let database: typeof ApiDatabase.Service;

describe("durable loot NPC revisions", () => {
  beforeAll(async () => {
    ({ runtime, database } = await fixture.connect());
  });

  afterEach(fixture.releaseSnapshotTestOutbox);

  afterAll(() => fixture.close());

  it("retains level revisions and reuses identical NPC observations without rewriting earlier loots", async () => {
    const { id, request } = await seed();
    const npcName = `Versioned hero ${randomUUID()}`;
    const lootIds: number[] = [];

    for (const lvl of [183, 210, 210]) {
      const result = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: randomUUID(),
            })),
            npcs: request.submission.npcs.map((npc) => ({
              ...npc,
              name: npcName,
              lvl,
            })),
          },
        }),
      );

      lootIds.push(result.id);
      snapshotTestLootIds.push(result.id);

      const saved = await npcSnapshots(result.id);
      expect(saved).toHaveLength(1);
      expect(saved[0]?.npc).toMatchObject({ name: npcName, lvl });
      expect((await lootRecord(id, result.id))?.npcs).toMatchObject([
        { name: npcName, lvl },
      ]);

      const intents = await publications(result.id);

      const created = intents.find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE,
      );

      const notification = intents.find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED,
      );

      const search = intents.find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.CATALOG_NPCS_INDEX,
      );

      const snapshot = saved[0]?.npc;

      if (!snapshot) throw new Error("Expected accepted NPC snapshot");

      expect(created).toMatchObject({
        data: { npcs: [{ lvl, type: "HERO", prof: "WARRIOR", wt: 85 }] },
      });
      expect(notification).toMatchObject({
        data: { npcs: [{ lvl, type: "HERO" }] },
      });
      expect(search).toMatchObject({
        data: [
          {
            id: snapshot.npcId,
            snapshotHash: snapshot.snapshotHash,
            name: snapshot.name,
            lvl: snapshot.lvl,
            type: snapshot.type,
            prof: snapshot.prof,
            icon: snapshot.icon,
            wt: snapshot.wt,
            margonemType: snapshot.margonemType,
            world: request.submission.world,
          },
        ],
      });
    }

    const saved = await Promise.all(lootIds.map(npcSnapshots));
    expect(saved[0]?.[0]?.npc.id).not.toBe(saved[1]?.[0]?.npc.id);
    expect(saved[1]?.[0]?.npc.id).toBe(saved[2]?.[0]?.npc.id);
    expect(saved.map((npcs) => npcs[0]?.npc.lvl)).toEqual([183, 210, 210]);
    expect(
      (await lootList(id)).map((loot) => loot.npcs[0]?.lvl).sort(),
    ).toEqual([183, 210, 210]);
  });

  it.each([
    ["name", { name: "Renamed hero" }, { name: "Renamed hero" }],
    ["icon", { icon: "revised.png" }, { icon: "revised.png" }],
    ["profession", { prof: "m" }, { prof: "MAGE" }],
    ["weight", { wt: 86 }, { wt: 86 }],
    ["Margonem type", { type: 3 }, { margonemType: 3 }],
    ["NPC classification", { wt: 25 }, { type: "ELITE2", wt: 25 }],
  ] satisfies Array<
    [
      string,
      Partial<CreateLootRequest["npcs"][number]>,
      Partial<typeof npcSnapshotTable.$inferSelect>,
    ]
  >)(
    "keeps a separate NPC revision when %s changes",
    async (_attribute, observedChange, persistedChange) => {
      const { id, request } = await seed();
      await runtime.runPromise(
        database.insert(lootlogConfigNpcTable).values({
          lootlogConfigId: id,
          npcType: "ELITE2",
          allowedRarities: ["HEROIC"],
          updatedAt: new Date(),
        }),
      );
      request.submission = {
        ...request.submission,
        world: `npc-revisions-${id}`,
      };
      const first = await runtime.runPromise(acceptance().accept(request));
      snapshotTestLootIds.push(first.id);
      const before = await npcSnapshots(first.id);

      const second = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: randomUUID(),
            })),
            npcs: request.submission.npcs.map((npc) => ({
              ...npc,
              ...observedChange,
            })),
          },
        }),
      );

      snapshotTestLootIds.push(second.id);
      const after = await npcSnapshots(second.id);

      expect(after).toHaveLength(1);
      expect(after[0]?.npc).toMatchObject(persistedChange);
      expect(after[0]?.npc.id).not.toBe(before[0]?.npc.id);
      expect(await npcSnapshots(first.id)).toEqual(before);
    },
  );

  it("reuses the NPC revision when a sender reports the icon's CDN URL", async () => {
    const { request } = await seed();
    const npcName = `CDN icon hero ${randomUUID()}`;
    const snapshotIds: number[] = [];

    for (const icon of [
      "npc.png",
      "https://micc.garmory-cdn.cloud/obrazki/npc/npc.png",
    ]) {
      const result = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: randomUUID(),
            })),
            npcs: request.submission.npcs.map((npc) => ({
              ...npc,
              name: npcName,
              icon,
            })),
          },
        }),
      );

      snapshotTestLootIds.push(result.id);
      const saved = await npcSnapshots(result.id);
      expect(saved[0]?.npc).toMatchObject({ name: npcName, icon: "npc.png" });
      snapshotIds.push(saved[0]?.npc.id ?? 0);
    }

    expect(snapshotIds[1]).toBe(snapshotIds[0]);
  });

  it("stores a game version on every loot and NPC revision, one revision per edition", async () => {
    const { request } = await seed();
    const name = `Game version hero ${randomUUID()}`;

    const accept = async (
      gameVersion: CreateLootRequest["gameVersion"],
      {
        hids = request.submission.loots.map(() => randomUUID()),
        world = request.submission.world,
      }: { hids?: string[]; world?: string } = {},
    ) => {
      const submission: CreateLootRequest = {
        ...request.submission,
        gameVersion,
        world,
        loots: request.submission.loots.map((item, index) => ({
          ...item,
          hid: hids[index] ?? randomUUID(),
        })),
        npcs: request.submission.npcs.map((npc) => ({
          ...npc,
          name,
          templateId: 257_636,
        })),
      };

      const result = await runtime.runPromise(
        acceptance().accept({ ...request, submission }),
      );

      snapshotTestLootIds.push(result.id);

      const [stored] = await runtime.runPromise(
        database
          .select({
            lootGameVersion: lootTable.gameVersion,
            snapshotId: npcSnapshotTable.id,
            snapshotGameVersion: npcSnapshotTable.gameVersion,
          })
          .from(lootTable)
          .innerJoin(lootNpcTable, eq(lootNpcTable.lootId, lootTable.id))
          .innerJoin(
            npcSnapshotTable,
            eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
          )
          .where(eq(lootTable.id, result.id)),
      );

      const search = (await publications(result.id)).find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.CATALOG_NPCS_INDEX,
      );

      return { hids, id: result.id, search, stored };
    };

    const polish = await accept("pl");
    const english = await accept("en", { world: "cronus" });

    expect(polish).toMatchObject({
      stored: {
        lootGameVersion: "pl",
        snapshotGameVersion: "pl",
      },
      search: {
        data: [
          { id: 257_636, gameVersion: "pl", world: request.submission.world },
        ],
      },
    });
    expect(english).toMatchObject({
      stored: { lootGameVersion: "en", snapshotGameVersion: "en" },
      search: { data: [{ id: 257_636, gameVersion: "en", world: "cronus" }] },
    });
    expect(english.stored?.snapshotId).not.toBe(polish.stored?.snapshotId);

    expect(
      (await accept("pl", { world: `other-${randomUUID()}` })).stored
        ?.snapshotId,
    ).toBe(polish.stored?.snapshotId);

    expect((await accept("en")).stored).toMatchObject({
      lootGameVersion: "en",
      snapshotId: english.stored?.snapshotId,
    });

    const retry = await accept("en", { hids: polish.hids });
    expect(retry.id).toBe(polish.id);
    expect(retry.stored).toEqual(polish.stored);
  });

  it("preserves an ambiguous legacy NPC row while accepting a new observed revision", async () => {
    const { id, request } = await seed();
    const name = `Legacy hero ${id}`;

    const [legacy] = await runtime.runPromise(
      database
        .insert(npcSnapshotTable)
        .values({
          gameVersion: "pl",
          npcId: 8234568,
          name,
          type: "HERO",
          lvl: 183,
          icon: "legacy.png",
          prof: "WARRIOR",
          wt: 85,
          margonemType: 2,
        })
        .returning(),
    );

    if (!legacy) throw new Error("Expected legacy NPC snapshot");

    const result = await runtime.runPromise(
      acceptance().accept({
        ...request,
        submission: {
          ...request.submission,
          npcs: request.submission.npcs.map((npc) => ({
            ...npc,
            name,
            lvl: 210,
          })),
        },
      }),
    );

    snapshotTestLootIds.push(result.id);

    const saved = await npcSnapshots(result.id);
    expect(saved[0]?.npc).toMatchObject({ name, lvl: 210, icon: "npc.png" });
    expect(saved[0]?.npc.id).not.toBe(legacy.id);
    expect(
      await runtime.runPromise(
        database
          .select()
          .from(npcSnapshotTable)
          .where(eq(npcSnapshotTable.id, legacy.id)),
      ),
    ).toEqual([legacy]);
  });

  it("reuses concurrent NPC revisions while retaining each loot's submitted roster order", async () => {
    const { id, request } = await seed();
    const primary = request.submission.npcs[0];

    if (!primary) throw new Error("Expected seeded NPC observation");

    const observations = [
      primary,
      { ...primary, id: primary.id + 1, name: "Second observed hero", wt: 86 },
    ];

    const rosters = [observations, observations.toReversed(), observations];

    const accepted = await Promise.all(
      rosters.map((npcs) =>
        runtime.runPromise(
          acceptance().accept({
            ...request,
            submission: {
              ...request.submission,
              npcs,
              world: `concurrent-npc-${id}`,
              loots: request.submission.loots.map((item) => ({
                ...item,
                hid: randomUUID(),
              })),
            },
          }),
        ),
      ),
    );

    snapshotTestLootIds.push(...accepted.map((loot) => loot.id));
    expect(new Set(accepted.map((loot) => loot.id)).size).toBe(3);

    const linked = await Promise.all(
      accepted.map((loot) => npcSnapshots(loot.id)),
    );

    expect(linked.every((npcs) => npcs.length === 2)).toBe(true);
    expect(
      new Set(linked.flatMap((npcs) => npcs.map(({ npc }) => npc.id))).size,
    ).toBe(2);
    expect(linked.map((npcs) => npcs.map(({ npc }) => npc.npcId))).toEqual(
      rosters.map((npcs) => npcs.map((npc) => npc.id)),
    );

    const returned = await Promise.all(
      accepted.map((loot) => lootRecord(id, loot.id)),
    );

    expect(returned.map((loot) => loot?.npcs.map((npc) => npc.id))).toEqual(
      rosters.map((npcs) => npcs.map((npc) => npc.id)),
    );
  });
});
