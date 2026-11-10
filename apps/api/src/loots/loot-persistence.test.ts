import { afterEach, describe, expect, it } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import {
  lootTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import { makeLootPersistence } from "#src/loots/loot-persistence";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import { createOrganizationLootRecordFixture } from "../../test/loot-fixtures.js";

const boundaries: Array<Awaited<ReturnType<typeof createDatabaseBoundary>>> =
  [];

afterEach(async () => {
  await Promise.all(boundaries.splice(0).map((boundary) => boundary.dispose()));
});

const now = new Date("2026-11-03T00:00:00Z");

const setup = async () => {
  const boundary = await createDatabaseBoundary();
  boundaries.push(boundary);
  const { database, run } = boundary;

  const [first, second] = await run(
    database
      .insert(guildTable)
      .values([
        createGuildFixture({ id: "first", ownerId: "owner" }),
        createGuildFixture({ id: "second", ownerId: "owner" }),
      ])
      .returning(),
  );

  if (!first || !second) throw new Error("Expected Organizations");

  await run(
    database.insert(lootTable).values(
      [1, 2].map((id) => ({
        gameVersion: "pl" as const,
        id,
        uniqueId: `liked-${id}`,
        world: "test",
        source: "FIGHT" as const,
        location: "Test location",
        updatedAt: now,
      })),
    ),
  );
  // Loot 1 is shared by both Organizations; loot 2 is archived in the first.
  await run(
    database.insert(organizationLootRecordTable).values([
      createOrganizationLootRecordFixture({
        id: 101,
        lootId: 1,
        guildId: first.id,
        updatedAt: now,
      }),
      createOrganizationLootRecordFixture({
        id: 102,
        lootId: 2,
        guildId: first.id,
        archivedAt: now,
        updatedAt: now,
      }),
      createOrganizationLootRecordFixture({
        id: 201,
        lootId: 1,
        guildId: second.id,
        updatedAt: now,
      }),
    ]),
  );
  await run(
    database.insert(memberTable).values([
      createMemberFixture({
        id: 1,
        guildId: first.id,
        userId: "alice",
        globalUserId: "alice-user",
        name: "Alice",
      }),
      createMemberFixture({
        id: 2,
        guildId: first.id,
        userId: "bob",
        globalUserId: "bob-user",
        name: "Bob",
      }),
      createMemberFixture({
        id: 3,
        guildId: second.id,
        userId: "alice",
        globalUserId: "alice-user",
        name: "Alice elsewhere",
      }),
      createMemberFixture({
        id: 4,
        guildId: first.id,
        userId: "former",
        globalUserId: "former-user",
        active: false,
      }),
    ]),
  );

  const persistence = makeLootPersistence(database);
  const query = makeLootQueryOperations(makeLootQueryPersistence(database));

  const setLike = (
    discordId: string,
    guildId: string,
    lootId: number,
    liked: boolean,
  ) => run(persistence.setLike({ discordId, guildId, lootId, liked }));

  const likerIds = async (guild: typeof first, lootId: number) =>
    (
      await run(query.fetchLootById(guild, [Permission.OWNER], [], lootId))
    )?.likes.map(({ id }) => id);

  return { run, persistence, first, second, setLike, likerIds };
};

describe("loot likes", () => {
  it("keeps one like per Member, isolates Organizations and ignores repeated requests", async () => {
    const { first, second, setLike, likerIds } = await setup();

    // A retried like must not count twice.
    await setLike("alice", first.id, 1, true);
    expect(
      (await setLike("alice", first.id, 1, true))?.map(({ id }) => id),
    ).toEqual([1]);
    expect(
      (await setLike("bob", first.id, 1, true))?.map(({ id }) => id),
    ).toEqual([1, 2]);

    // The same loot in another Organization has its own likes.
    expect(
      (await setLike("alice", second.id, 1, true))?.map(({ id }) => id),
    ).toEqual([3]);
    expect(await likerIds(first, 1)).toEqual([1, 2]);
    expect(await likerIds(second, 1)).toEqual([3]);

    // Unliking removes only the caller's like, and repeating it is harmless.
    expect(
      (await setLike("alice", first.id, 1, false))?.map(({ id }) => id),
    ).toEqual([2]);
    expect(
      (await setLike("alice", first.id, 1, false))?.map(({ id }) => id),
    ).toEqual([2]);
    expect(await likerIds(first, 1)).toEqual([2]);
    expect(await likerIds(second, 1)).toEqual([3]);
  });

  it("rejects archived loots and Members who left the Organization", async () => {
    const { run, persistence, first, setLike, likerIds } = await setup();

    expect(await setLike("alice", first.id, 2, true)).toBeNull();
    expect(await setLike("alice", first.id, 99, true)).toBeNull();

    const failure = await run(
      Effect.flip(
        persistence.setLike({
          discordId: "former",
          guildId: first.id,
          lootId: 1,
          liked: true,
        }),
      ),
    );

    expect(failure._tag).toBe("LootPersistenceError");
    expect(await likerIds(first, 1)).toEqual([]);
  });
});
