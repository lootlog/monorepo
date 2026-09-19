import { expect, test } from "bun:test";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  guildTable,
  lootTable,
  lootSubmissionTable,
  memberTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/schema";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { makeLootAllocationPersistence } from "./loot-allocation-persistence.js";

test("allocation requires a recent actor submission and access to every organization at the atomic update", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database, run } = boundary;
    const now = new Date();
    await run(
      database
        .insert(guildTable)
        .values(
          ["1", "2"].map((id) =>
            createGuildFixture({ id, ownerId: "discord-1" }),
          ),
        ),
    );
    await run(
      database.insert(memberTable).values(
        createMemberFixture({
          id: 1,
          guildId: "1",
          userId: "discord-1",
          globalUserId: "user-1",
        }),
      ),
    );
    await run(
      database.insert(lootTable).values({
        id: 1,
        uniqueId: "allocation",
        world: "world",
        location: "map",
        source: "FIGHT",
        updatedAt: now,
      }),
    );
    await run(
      database
        .insert(organizationLootRecordTable)
        .values({ id: 1, lootId: 1, guildId: "1", updatedAt: now }),
    );
    await run(
      database
        .insert(lootSubmissionTable)
        .values({ organizationLootRecordId: 1, memberId: 1, updatedAt: now }),
    );
    const persistence = makeLootAllocationPersistence(database);

    const options = {
      actorUserId: "user-1",
      lootId: 1,
      submissionCutoff: new Date(Date.now() - 60_000),
    };

    const scoped = <A, E>(effect: Effect.Effect<A, E>) =>
      run(
        effect.pipe(
          Effect.provideService(ForwardAuthIdentity, {
            userId: "user-1",
            discordId: "discord-1",
            apiKey: {
              keyId: "key",
              organizationIds: ["1"],
              mode: "read-write",
              personalData: true,
              expiresAt: null,
            },
          }),
        ),
      );

    expect(await scoped(persistence.findAuthorizedLoot(options))).toMatchObject(
      { id: 1 },
    );
    expect(
      await scoped(
        persistence.findAuthorizedLoot({ ...options, actorUserId: "other" }),
      ),
    ).toBeNull();
    expect(
      await scoped(
        persistence.compareAndSetChatAllocation({
          ...options,
          actorUserId: "other",
          lootShare: {},
        }),
      ),
    ).toBe(false);
    await run(
      database
        .insert(organizationLootRecordTable)
        .values({ id: 2, lootId: 1, guildId: "2", updatedAt: now }),
    );
    expect(
      await scoped(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(false);
    expect(
      await scoped(persistence.findAuthorizedAllocationState(options)),
    ).toBeNull();
    await run(
      database
        .delete(organizationLootRecordTable)
        .where(eq(organizationLootRecordTable.id, 2)),
    );
    await run(
      database
        .update(lootSubmissionTable)
        .set({ createdAt: new Date(Date.now() - 120_000) }),
    );
    expect(await scoped(persistence.findAuthorizedLoot(options))).toBeNull();
    expect(
      await scoped(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(false);
    await run(
      database.update(lootSubmissionTable).set({ createdAt: new Date() }),
    );
    expect(
      await scoped(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(true);
    expect(
      await scoped(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(false);
    expect(
      await scoped(persistence.findAuthorizedAllocationState(options)),
    ).toEqual({ lootShare: {}, lootShareSource: "CHAT_MESSAGE" });
  } finally {
    await boundary.dispose();
  }
});
