import { expect, test, mock } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { createGuildFixture } from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  UserLootlogConfigData,
  type UserLootlogConfigCache,
} from "./user-lootlog-config.handlers.js";

test("key config updates preserve other organizations and never reuse the unrestricted account cache", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const getJson = mock<UserLootlogConfigCache["getJson"]>(() =>
      Effect.die("unscoped cache read"),
    );

    const setJson = mock<UserLootlogConfigCache["setJson"]>(() => Effect.void);

    const cache: UserLootlogConfigCache = {
      getJson,
      setJson,
      deleteByPattern: () => Effect.void,
    };

    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "1", ownerId: "discord-1" }),
          createGuildFixture({ id: "2", ownerId: "discord-1" }),
        ]),
    );
    await boundary.run(
      boundary.database.insert(userCharactersLootlogSettingsTable).values({
        userId: "discord-1",
        accountId: "account",
        characterId: "character",
        catchingGuildIds: ["1", "2"],
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }),
    );

    const result = await boundary.run(
      Effect.gen(function* () {
        const data = yield* UserLootlogConfigData;
        const before = yield* data.getAccount("discord-1", "account");

        const updated = yield* data.upsertCharacter("discord-1", "account", {
          characterId: "character",
          catchingGuildIds: [],
        });

        const batch = yield* data.getPlayersCatchingGuilds("discord-1", {
          players: [
            {
              userId: "discord-1",
              accountId: "account",
              characterId: "character",
            },
          ],
        });

        return { before, updated, batch };
      }).pipe(
        Effect.provide(UserLootlogConfigData.layerDatabase(cache)),
        Effect.provideService(ForwardAuthIdentity, {
          userId: "user-1",
          discordId: "discord-1",
          apiKey: {
            keyId: "key-1",
            organizationIds: ["1"],
            mode: "read-write",
            personalData: true,
            expiresAt: null,
          },
        }),
      ),
    );

    expect(result.before).toMatchObject({
      character: { catchingGuildIds: ["1"] },
    });
    expect(result.updated).toMatchObject({ catchingGuildIds: [] });
    expect(result.batch).toMatchObject({ players: [{ guilds: [] }] });
    expect(
      (
        await boundary.run(
          boundary.database.select().from(userCharactersLootlogSettingsTable),
        )
      )[0]?.catchingGuildIds,
    ).toEqual(["2"]);
    expect(getJson).not.toHaveBeenCalled();
    expect(setJson).not.toHaveBeenCalled();
  } finally {
    await boundary.dispose();
  }
});
