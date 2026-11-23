import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { MapPlayersSnapshot } from "@lootlog/protocol/loot-summary";
import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  playerSnapshotTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import {
  makeLootAcceptanceFixture,
  type ApiDatabaseRuntime,
  mapPlayersSnapshot,
} from "./loot-acceptance-fixtures.js";

const fixture = makeLootAcceptanceFixture();

const {
  seed,
  acceptance,
  pending,
  mapPlayerLinks,
  snapshotTestLootIds,
  lootRecord,
  lootList,
} = fixture;

let runtime: ApiDatabaseRuntime;

let database: typeof ApiDatabase.Service;

describe("durable loot map players", () => {
  beforeAll(async () => {
    ({ runtime, database } = await fixture.connect());
  });

  afterEach(fixture.releaseSnapshotTestOutbox);

  afterAll(() => fixture.close());

  it("persists map players for legendary elite2 and keeps Organization observations isolated", async () => {
    const first = await seed(true);
    const second = await seed(true);
    const unrelated = await seed(true);
    first.request.submission = {
      ...first.request.submission,
      mapPlayersSnapshot,
    };
    const result = await runtime.runPromise(acceptance().accept(first.request));
    snapshotTestLootIds.push(result.id);

    const secondSnapshot = [
      {
        ...mapPlayersSnapshot[0]!,
        accountId: 222,
        characterId: 333,
        name: "Other Organization observer",
      },
    ] satisfies MapPlayersSnapshot;

    second.request.submission = {
      ...second.request.submission,
      loots: first.request.submission.loots,
      mapPlayersSnapshot: secondSnapshot,
    };
    expect(
      (await runtime.runPromise(acceptance().accept(second.request))).id,
    ).toBe(result.id);
    expect((await lootRecord(first.id, result.id))?.mapPlayersSnapshot).toEqual(
      mapPlayersSnapshot,
    );
    expect(
      (await lootRecord(second.id, result.id))?.mapPlayersSnapshot,
    ).toEqual(secondSnapshot);
    expect(await lootRecord(first.id, result.id, [])).toBeNull();
    expect(await lootRecord(unrelated.id, result.id)).toBeNull();
    expect(
      (await lootList(first.id)).map((loot) => loot.mapPlayersSnapshot),
    ).toEqual([mapPlayersSnapshot]);
    expect(
      (await lootList(second.id)).map((loot) => loot.mapPlayersSnapshot),
    ).toEqual([secondSnapshot]);
    expect(await lootList(unrelated.id)).toEqual([]);
    await runtime.runPromise(
      database
        .update(organizationLootRecordTable)
        .set({ archivedAt: new Date() })
        .where(eq(organizationLootRecordTable.guildId, first.id)),
    );
    expect(await lootRecord(first.id, result.id)).toBeNull();
    expect(
      (await lootRecord(second.id, result.id))?.mapPlayersSnapshot,
    ).toEqual(secondSnapshot);
  });

  it("accepts map observers whose legacy concatenated hash collides without changing historical snapshots", async () => {
    const { id, request } = await seed(true);

    const legacyObserver = {
      accountId: 321,
      characterId: 654,
      name: "Foo",
      prof: "WARRIOR" as const,
      icon: "outfit.gif",
      lvl: 284,
    };

    const observer = { ...legacyObserver, name: "Foow", prof: null };
    const world = `hash-collision-${id}`;

    const legacyHash = createHash("sha256")
      .update("Foowoutfit.gif")
      .digest("hex");

    const [legacy] = await runtime.runPromise(
      database
        .insert(playerSnapshotTable)
        .values({ ...legacyObserver, world, snapshotHash: legacyHash })
        .returning(),
    );

    if (!legacy) throw new Error("Expected historical player snapshot");
    request.submission = {
      ...request.submission,
      world,
      mapPlayersSnapshot: [observer],
    };
    const created = await runtime.runPromise(acceptance().accept(request));
    snapshotTestLootIds.push(created.id);
    expect((await lootRecord(id, created.id))?.mapPlayersSnapshot).toEqual([
      observer,
    ]);
    const newLinks = await mapPlayerLinks(id, created.id);
    expect(newLinks[0]?.playerSnapshotId).not.toBe(legacy.id);
    expect(
      await runtime.runPromise(
        database
          .select()
          .from(playerSnapshotTable)
          .where(eq(playerSnapshotTable.id, legacy.id)),
      ),
    ).toEqual([legacy]);

    request.submission = {
      ...request.submission,
      loots: request.submission.loots.map((item) => ({
        ...item,
        hid: randomUUID(),
      })),
      mapPlayersSnapshot: [legacyObserver],
    };
    const later = await runtime.runPromise(acceptance().accept(request));
    snapshotTestLootIds.push(later.id);
    expect((await mapPlayerLinks(id, later.id))[0]?.playerSnapshotId).toBe(
      legacy.id,
    );
    expect((await lootRecord(id, later.id))?.mapPlayersSnapshot).toEqual([
      legacyObserver,
    ]);
  });

  it.each([
    { name: "Renamed player" },
    { prof: "MAGE" as const },
    { icon: "new-outfit.png" },
  ])(
    "preserves old map presence when player snapshot attributes change: %j",
    async (change) => {
      const { id, request } = await seed(true);

      const original = {
        accountId: 123,
        characterId: 456,
        name: "Player",
        prof: "WARRIOR" as const,
        icon: "player.png",
        lvl: 285,
      };

      request.submission = {
        ...request.submission,
        world: `outbox-test-${id}`,
        mapPlayersSnapshot: [original],
      };
      const first = await runtime.runPromise(acceptance().accept(request));
      snapshotTestLootIds.push(first.id);
      const changed = { ...original, ...change };

      const second = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: randomUUID(),
            })),
            mapPlayersSnapshot: [changed],
          },
        }),
      );

      snapshotTestLootIds.push(second.id);
      expect(second.id).not.toBe(first.id);
      const originalLinks = await mapPlayerLinks(id, first.id);
      const changedLinks = await mapPlayerLinks(id, second.id);
      expect(originalLinks).toHaveLength(1);
      expect(changedLinks).toHaveLength(1);
      expect(originalLinks[0]?.playerSnapshotId).not.toBe(
        changedLinks[0]?.playerSnapshotId,
      );

      const storedSnapshots = await runtime.runPromise(
        database
          .select()
          .from(playerSnapshotTable)
          .where(eq(playerSnapshotTable.world, request.submission.world)),
      );

      const { lvl: _originalLvl, ...originalPlayer } = original;
      const { lvl: _changedLvl, ...changedPlayer } = changed;

      expect(storedSnapshots).toHaveLength(2);
      expect(storedSnapshots).toEqual(
        expect.arrayContaining([
          expect.objectContaining(originalPlayer),
          expect.objectContaining(changedPlayer),
        ]),
      );
      expect((await lootRecord(id, first.id))?.mapPlayersSnapshot).toEqual([
        original,
      ]);
      expect((await lootRecord(id, second.id))?.mapPlayersSnapshot).toEqual([
        changed,
      ]);
    },
  );

  it("fills a missing snapshot on same-member retry once, atomically, without duplicating submissions", async () => {
    const { id, request } = await seed(true);
    const result = await runtime.runPromise(acceptance().accept(request));
    snapshotTestLootIds.push(result.id);
    expect((await lootRecord(id, result.id))?.mapPlayersSnapshot).toBeNull();
    expect(await mapPlayerLinks(id, result.id)).toEqual([]);

    const firstSnapshot = [
      ...mapPlayersSnapshot,
      { ...mapPlayersSnapshot[0]!, characterId: 1001, name: "First witness" },
    ] satisfies MapPlayersSnapshot;

    const otherSnapshot = [
      { ...mapPlayersSnapshot[0]!, name: "Later observer" },
      { ...mapPlayersSnapshot[0]!, characterId: 1002, name: "Second witness" },
      { ...mapPlayersSnapshot[0]!, characterId: 1003, name: "Third witness" },
    ] satisfies MapPlayersSnapshot;

    await Promise.all(
      [firstSnapshot, otherSnapshot].map((snapshot) =>
        runtime.runPromise(
          acceptance().accept({
            ...request,
            submission: { ...request.submission, mapPlayersSnapshot: snapshot },
          }),
        ),
      ),
    );
    const saved = (await lootRecord(id, result.id))?.mapPlayersSnapshot;

    if (!saved) throw new Error("Expected winning map snapshot");
    expect([firstSnapshot, otherSnapshot]).toContainEqual([...saved]);
    const linksBeforeRetry = await mapPlayerLinks(id, result.id);
    expect(linksBeforeRetry).toHaveLength(saved.length);
    const intentsBeforeRetry = (await pending(result.id)).length;
    await runtime.runPromise(
      acceptance().accept({
        ...request,
        submission: {
          ...request.submission,
          mapPlayersSnapshot: otherSnapshot,
        },
      }),
    );
    expect((await lootRecord(id, result.id))?.mapPlayersSnapshot).toEqual(
      saved,
    );
    expect(await mapPlayerLinks(id, result.id)).toEqual(linksBeforeRetry);
    expect((await lootRecord(id, result.id))?.submissions).toHaveLength(1);
    expect(await pending(result.id)).toHaveLength(intentsBeforeRetry);
  });

  it("keeps map players for a legendary from any NPC type, but not for other rarities or sources", async () => {
    await Promise.all(
      (["hero", "heroic", "dialog"] as const).map(async (variant) => {
        const { id, request } = await seed(variant !== "hero");
        request.submission = {
          ...request.submission,
          mapPlayersSnapshot,
          source: variant === "dialog" ? "DIALOG" : "FIGHT",
          loots: request.submission.loots.map((item) => ({
            ...item,
            stat:
              variant === "heroic"
                ? "rarity=heroic;lvl=80"
                : "rarity=legendary;lvl=80",
          })),
        };
        const result = await runtime.runPromise(acceptance().accept(request));
        snapshotTestLootIds.push(result.id);

        if (variant === "hero") {
          expect((await lootRecord(id, result.id))?.mapPlayersSnapshot).toEqual(
            mapPlayersSnapshot,
          );

          return;
        }

        expect(
          (await lootRecord(id, result.id))?.mapPlayersSnapshot,
        ).toBeNull();
        expect(await mapPlayerLinks(id, result.id)).toEqual([]);
      }),
    );
  });
});
