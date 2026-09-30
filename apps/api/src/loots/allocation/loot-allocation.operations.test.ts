import { applicationLogger as logger } from "#src/shared/application-logger";
import { Effect } from "effect";
import { describe, expect, it } from "bun:test";
import { LootShareSourceEnum as LootShareSource } from "@lootlog/schema/loot";
import type { LootAllocationPersistence } from "#src/loots/allocation/loot-allocation-persistence";
import type { LootShare } from "#src/loots/loot-response.schema";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import { makeLootAllocationOperations } from "#src/loots/allocation/loot-allocation.operations";

type AuthorizedLoot = NonNullable<
  Effect.Success<ReturnType<LootAllocationPersistence["findAuthorizedLoot"]>>
>;

const createdAt = new Date("2026-09-29T12:00:00.000Z");

const lootItem = (
  hid: string,
  itemId: number,
): AuthorizedLoot["lootItems"][number] => ({
  id: itemId,
  lootId: 42,
  itemSnapshotId: itemId,
  hid,
  itemSnapshot: {
    id: itemId,
    itemId,
    statsHash: `hash-${itemId}`,
    name: `Item ${itemId}`,
    icon: "item.gif",
    lvl: 100,
    rarity: null,
    itemType: null,
    statRaw: "",
    statsSnapshot: {},
    createdAt,
  },
});

const lootPlayer = (
  name: string,
  characterId: number,
): AuthorizedLoot["lootPlayers"][number] => ({
  id: characterId,
  lootId: 42,
  playerSnapshotId: characterId,
  lvl: 100,
  hpp: 100,
  playerSnapshot: {
    id: characterId,
    world: "fobos",
    accountId: 7,
    characterId,
    snapshotHash: `hash-${characterId}`,
    name,
    prof: null,
    icon: null,
    createdAt,
  },
});

const authorizedLoot: AuthorizedLoot = {
  id: 42,
  uniqueId: "loot-42",
  world: "fobos",
  gameVersion: null,
  source: "FIGHT",
  location: "Map",
  createdAt,
  updatedAt: createdAt,
  lootShare: {},
  lootShareSource: LootShareSource.NONE,
  lootItems: [lootItem("aa", 1), lootItem("bb", 2)],
  lootPlayers: [lootPlayer("Alice", 11), lootPlayer("Bob", 12)],
  lootNpcs: [],
  organizationLootRecords: [{ guildId: "guild-1" }],
};

const setup = (loot: AuthorizedLoot | null) => {
  const writes: LootShare[] = [];
  const published: LootShare[] = [];

  const operations = makeLootAllocationOperations({
    persistence: {
      findAuthorizedLoot: () => Effect.succeed(loot),
      compareAndSetChatAllocation: ({ lootShare }) => {
        writes.push(lootShare);

        return Effect.succeed(true);
      },
      findAuthorizedAllocationState: () =>
        Effect.die("Unexpected allocation state read"),
    },
    cache: { invalidateScopes: () => Effect.void },
    publisher: {
      publish: (_exchange, _routingKey, event) => {
        published.push(event.lootShare);

        return Effect.void;
      },
    },
    logger,
  });

  const confirm = (message: string) =>
    Effect.runPromise(
      operations.confirmFromChat({
        actorUserId: "user-1",
        lootId: 42,
        message,
      }),
    );

  return { confirm, writes, published };
};

describe("loot allocation Effect module", () => {
  it("rejects an unauthorized allocation as a client error before any write", async () => {
    const { confirm, writes, published } = setup(null);

    await expect(confirm("allocation")).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(writes).toEqual([]);
    expect(published).toEqual([]);
  });

  it("accepts a chat share without any loot item and keeps the allocation", async () => {
    const { confirm, writes, published } = setup(authorizedLoot);

    expect(
      await confirm('Alice otrzymał ITEM#ff:"Rejected elsewhere"'),
    ).toEqual({});
    expect(writes).toEqual([]);
    expect(published).toEqual([]);
  });

  it("records a chat share that covers only some loot items", async () => {
    const { confirm, writes, published } = setup(authorizedLoot);

    expect(await confirm('Bob otrzymał ITEM#bb:"Item 2"')).toEqual({
      "127": ["bb"],
    });
    expect(writes).toEqual([{ "127": ["bb"] }]);
    expect(published).toEqual([{ "127": ["bb"] }]);
  });
});
