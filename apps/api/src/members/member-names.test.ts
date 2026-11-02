import { expect, test } from "bun:test";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import { guildTable, memberTable } from "#src/database/drizzle/schema";
import { findMemberNames } from "./member-names.js";

test("names actors by their member in the requested Organization only", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database, run } = boundary;

    await run(
      database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "guild-1" }),
          createGuildFixture({ id: "guild-2" }),
        ]),
    );
    await run(
      database.insert(memberTable).values([
        createMemberFixture({
          id: 1,
          guildId: "guild-1",
          userId: "discord-1",
          globalUserId: "user-1",
          name: "Kamil",
        }),
        createMemberFixture({
          id: 2,
          guildId: "guild-2",
          userId: "discord-1",
          globalUserId: "user-1",
          name: "Other server nickname",
        }),
        createMemberFixture({
          id: 3,
          guildId: "guild-2",
          userId: "discord-2",
          globalUserId: "user-2",
          name: "Outsider",
        }),
      ]),
    );

    const names = await run(
      findMemberNames(database, "guild-1", {
        discordIds: ["discord-1", "discord-2"],
        userIds: ["user-1", "user-2"],
      }),
    );

    expect(names.byDiscordId).toEqual(new Map([["discord-1", "Kamil"]]));
    expect(names.byUserId).toEqual(new Map([["user-1", "Kamil"]]));
  } finally {
    await boundary.dispose();
  }
});
