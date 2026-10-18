import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { makeMemberReadDataLayer } from "./member-read.data-layer.js";
import { MemberReadData } from "./members.handlers.js";

test("config summaries hide members who left and Organizations they can no longer submit loot to", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values(createGuildFixture({ id: "guild-1", ownerId: "owner" })),
    );
    await boundary.run(
      boundary.database.insert(roleTable).values([
        {
          id: "role-writer",
          guildId: "guild-1",
          name: "Writer",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
          updatedAt: new Date(0),
        },
        {
          id: "role-reader",
          guildId: "guild-1",
          name: "Reader",
          permissions: [Permission.LOOTLOG_ACCESS],
          updatedAt: new Date(0),
        },
      ]),
    );
    await boundary.run(
      boundary.database.insert(memberTable).values([
        createMemberFixture({
          id: 1,
          userId: "writer",
          globalUserId: "writer-user",
        }),
        createMemberFixture({
          id: 2,
          userId: "reader",
          globalUserId: "reader-user",
        }),
        createMemberFixture({
          id: 3,
          userId: "left",
          globalUserId: "left-user",
          active: false,
        }),
      ]),
    );
    await boundary.run(
      boundary.database.insert(memberToRoleTable).values([
        { A: 1, B: "role-writer" },
        { A: 2, B: "role-reader" },
      ]),
    );
    await boundary.run(
      boundary.database.insert(userCharactersLootlogSettingsTable).values(
        ["writer", "reader", "left"].map((userId) => ({
          userId,
          accountId: "1",
          characterId: "1",
          catchingGuildIds: ["guild-1"],
          createdAt: new Date(0),
          updatedAt: new Date(0),
        })),
      ),
    );

    const summaries = await boundary.run(
      Effect.gen(function* () {
        const data = yield* MemberReadData;

        return {
          writer: yield* data.getLootlogConfigSummary("guild-1", "writer"),
          reader: yield* data.getLootlogConfigSummary("guild-1", "reader"),
          left: yield* Effect.result(
            data.getLootlogConfigSummary("guild-1", "left"),
          ),
        };
      }).pipe(
        Effect.provide(
          makeMemberReadDataLayer({
            getOrSetJsonEffect: ({ factory }) => factory,
          }),
        ),
      ),
    );

    expect(summaries.writer).toMatchObject({
      enabledCharacterCount: 1,
      characters: [{ enabledForGuild: true }],
    });
    expect(summaries.reader).toMatchObject({
      enabledCharacterCount: 0,
      characters: [{ enabledForGuild: false }],
    });
    expect(summaries.left).toMatchObject({
      failure: { cause: { message: "Member not found" } },
    });
  } finally {
    await boundary.dispose();
  }
});
