import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { CreateLootRequest } from "#src/contracts/loots/schemas";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  lootNpcTable,
  npcSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import {
  makeLootAcceptanceFixture,
  type ApiDatabaseRuntime,
} from "./loot-acceptance-fixtures.js";

const fixture = makeLootAcceptanceFixture();

const { seed, acceptance, publications, snapshotTestLootIds, lootRecord } =
  fixture;

let runtime: ApiDatabaseRuntime;

let database: typeof ApiDatabase.Service;

describe("durable loot NPC attribution", () => {
  beforeAll(async () => {
    ({ runtime, database } = await fixture.connect());
  });

  afterEach(fixture.releaseSnapshotTestOutbox);

  afterAll(() => fixture.close());

  it("attributes a group fight's items to its boss, not to the escort", async () => {
    const { request } = await seed();
    const [boss] = request.submission.npcs;

    if (!boss) throw new Error("Expected a seeded NPC");

    const result = await runtime.runPromise(
      acceptance().accept({
        ...request,
        submission: {
          ...request.submission,
          npcs: [
            boss,
            { ...boss, id: boss.id + 1, name: "Test escort", wt: 1 },
          ],
        },
      }),
    );

    snapshotTestLootIds.push(result.id);

    const search = (await publications(result.id)).find(
      (intent) =>
        intent.kind === "rabbit" &&
        intent.routingKey === RabbitRoutingKey.CATALOG_ITEMS_INDEX,
    );

    expect(search).toMatchObject({
      data: [
        {
          droppedBy: { id: boss.id, name: boss.name, type: "HERO" },
          observedAt: expect.any(String),
        },
      ],
    });
  });

  it("attributes a dialog's items to its only NPC", async () => {
    const { request } = await seed();
    const [npc] = request.submission.npcs;

    if (!npc) throw new Error("Expected a seeded NPC");

    const indexed = async (
      npcs: (typeof request.submission.npcs)[number][],
    ) => {
      const result = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            source: "DIALOG",
            npcs,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: `${item.hid}-${npcs.length}`,
            })),
          },
        }),
      );

      snapshotTestLootIds.push(result.id);

      return (await publications(result.id)).find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.CATALOG_ITEMS_INDEX,
      );
    };

    expect(await indexed([npc])).toMatchObject({
      data: [{ droppedBy: { id: npc.id, name: npc.name } }],
    });

    const ambiguous = await indexed([
      npc,
      { ...npc, id: npc.id + 1, name: "Test pickaxe" },
    ]);

    expect(ambiguous).toMatchObject({
      data: [expect.not.objectContaining({ droppedBy: expect.anything() })],
    });
  });

  it("stores explicit template and runtime NPC identities apart from the overloaded id", async () => {
    const { request } = await seed();
    const name = `Identity hero ${randomUUID()}`;

    const accept = async (npc: Partial<CreateLootRequest["npcs"][number]>) => {
      const result = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: randomUUID(),
            })),
            npcs: request.submission.npcs.map((base) => ({
              ...base,
              name,
              ...npc,
            })),
          },
        }),
      );

      snapshotTestLootIds.push(result.id);

      const [link] = await runtime.runPromise(
        database
          .select({
            runtimeNpcId: lootNpcTable.runtimeNpcId,
            npcId: npcSnapshotTable.npcId,
            identityNamespace: npcSnapshotTable.identityNamespace,
          })
          .from(lootNpcTable)
          .innerJoin(
            npcSnapshotTable,
            eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
          )
          .where(eq(lootNpcTable.lootId, result.id)),
      );

      const search = (await publications(result.id)).find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.CATALOG_NPCS_INDEX,
      );

      return { link, search };
    };

    expect(
      await accept({ id: 313_103, runtimeId: 313_103, templateId: 257_636 }),
    ).toMatchObject({
      link: {
        runtimeNpcId: 313_103,
        npcId: 257_636,
        identityNamespace: "template",
      },
      search: { data: [{ id: 257_636, identityNamespace: "template" }] },
    });
    expect(
      await accept({ id: 313_104, runtimeId: 313_104, templateId: null }),
    ).toMatchObject({
      link: {
        runtimeNpcId: 313_104,
        npcId: 313_104,
        identityNamespace: "runtime",
      },
      search: { data: [{ id: 313_104, identityNamespace: "runtime" }] },
    });
    expect(await accept({ id: 257_636 })).toMatchObject({
      link: { runtimeNpcId: null, npcId: 257_636, identityNamespace: "legacy" },
      search: { data: [{ id: 257_636, identityNamespace: "legacy" }] },
    });
  });

  it("publishes persisted NPC visibility when another Organization retries a loot with changed NPC data", async () => {
    const first = await seed();
    const second = await seed();
    first.request.submission = {
      ...first.request.submission,
      npcs: first.request.submission.npcs.map((npc) => ({
        ...npc,
        name: `Retry hero ${first.id}`,
        lvl: 183,
      })),
    };

    const accepted = await runtime.runPromise(
      acceptance().accept(first.request),
    );

    snapshotTestLootIds.push(accepted.id);
    second.request.submission = {
      ...first.request.submission,
      npcs: first.request.submission.npcs.map((npc) => ({
        ...npc,
        lvl: 210,
        prof: "m",
        wt: 86,
      })),
    };

    const appended = await runtime.runPromise(
      acceptance().accept(second.request),
    );

    expect(appended.id).toBe(accepted.id);
    expect((await lootRecord(second.id, accepted.id))?.npcs).toMatchObject([
      { lvl: 183, prof: "WARRIOR", type: "HERO", wt: 85 },
    ]);

    const created = (await publications(accepted.id)).filter(
      (intent) =>
        intent.kind === "rabbit" &&
        intent.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE,
    );

    expect(created).toHaveLength(2);

    for (const publication of created) {
      expect(publication).toMatchObject({
        data: {
          npcs: [{ lvl: 183, prof: "WARRIOR", type: "HERO", wt: 85 }],
        },
      });
    }
  });
});
