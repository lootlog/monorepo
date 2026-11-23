import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/user.schema";
import {
  userKillBucketTable,
  userKillTotalTable,
  memberKillBucketTable,
  memberKillTotalTable,
  guildKillActivityTable,
  guildKillBucketTable,
  guildKillTotalTable,
} from "#src/database/drizzle/kill-statistics.schema";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { Effect } from "effect";
import { expect, it } from "bun:test";
import { makeKillCreation, type KillCreationCache } from "./kill-creation.js";
import { payload } from "./kill-creation.fixtures.js";

it("stores the relative NPC icon when a sender reports its CDN URL", async () => {
  const boundary = await createDatabaseBoundary();

  const cache: KillCreationCache = {
    invalidateScopes: () => Effect.succeed(0),
    deleteIfValue: () => Effect.succeed(0),
    setNx: () => Effect.succeed(true),
    setNxGet: () => Effect.succeed(null),
  };

  try {
    const database = boundary.database;
    await boundary.run(
      database
        .insert(guildTable)
        .values(createGuildFixture({ id: "123", ownerId: "discord-1" })),
    );
    await boundary.run(
      database.insert(memberTable).values(
        createMemberFixture({
          id: 1,
          guildId: "123",
          userId: "discord-1",
          globalUserId: "user",
        }),
      ),
    );
    await boundary.run(
      database.insert(userCharactersLootlogSettingsTable).values({
        userId: "discord-1",
        accountId: payload.accountId,
        characterId: payload.characterId,
        catchingGuildIds: ["123"],
        updatedAt: new Date(),
      }),
    );

    await boundary.run(
      makeKillCreation(database, cache)("discord-1", {
        ...payload,
        npc: {
          ...payload.npc,
          icon: "https://micc.garmory-cdn.cloud/obrazki/npc/her/mushita.gif",
        },
      }),
    );

    for (const table of [
      userKillTotalTable,
      userKillBucketTable,
      memberKillTotalTable,
      memberKillBucketTable,
      guildKillTotalTable,
      guildKillBucketTable,
    ]) {
      expect(
        (await boundary.run(database.select().from(table))).map(
          ({ npcIcon }) => npcIcon,
        ),
      ).toEqual(["her/mushita.gif"]);
    }
  } finally {
    await boundary.dispose();
  }
});

it("journals an event hero kill in the Organization activity feed", async () => {
  const boundary = await createDatabaseBoundary();

  const cache: KillCreationCache = {
    invalidateScopes: () => Effect.succeed(0),
    deleteIfValue: () => Effect.succeed(0),
    setNx: () => Effect.succeed(true),
    setNxGet: () => Effect.succeed(null),
  };

  try {
    const database = boundary.database;
    await boundary.run(
      database
        .insert(guildTable)
        .values(createGuildFixture({ id: "123", ownerId: "discord-1" })),
    );
    await boundary.run(
      database.insert(memberTable).values(
        createMemberFixture({
          id: 1,
          guildId: "123",
          userId: "discord-1",
          globalUserId: "user",
        }),
      ),
    );
    await boundary.run(
      database.insert(userCharactersLootlogSettingsTable).values({
        userId: "discord-1",
        accountId: payload.accountId,
        characterId: payload.characterId,
        catchingGuildIds: ["123"],
        updatedAt: new Date(),
      }),
    );

    await boundary.run(
      makeKillCreation(database, cache)("discord-1", {
        ...payload,
        npc: { ...payload.npc, icon: "hev/mushita.gif" },
      }),
    );

    expect(
      (await boundary.run(database.select().from(guildKillActivityTable))).map(
        ({ guildId, npcType }) => ({ guildId, npcType }),
      ),
    ).toEqual([{ guildId: "123", npcType: "EVENT_HERO" }]);
  } finally {
    await boundary.dispose();
  }
});
