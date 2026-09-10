import { expect, test } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { createGuildFixture } from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  userSettingsTable,
  userSettingDocumentTable,
} from "#src/database/drizzle/schema";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { makeSettingsDocuments } from "#src/settings-documents/settings-documents.service";
import { makeUserPreferencesData } from "./user-preferences.data-layer.js";

const makeData = (
  boundary: Awaited<ReturnType<typeof createDatabaseBoundary>>,
) =>
  boundary
    .run(
      Effect.service(SettingsDocumentsRepository).pipe(
        Effect.provide(SettingsDocumentsRepository.layerDatabase),
      ),
    )
    .then((repository) =>
      makeUserPreferencesData(
        boundary.database,
        makeSettingsDocuments(repository),
      ),
    );

test("key preferences hide unselected organizations and reject destructive routing replacements", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "1", ownerId: "discord-1" }),
          createGuildFixture({ id: "2", ownerId: "discord-1" }),
        ]),
    );
    await boundary.run(
      boundary.database.insert(userSettingsTable).values({
        userId: "user-1",
        guildsOrder: ["1", "2"],
        hiddenGuildIds: ["2"],
        theme: "default",
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }),
    );
    const data = await makeData(boundary);
    await boundary.run(
      data.updateUserGameAccountPreferences("user-1", "account", {
        detector: {
          routingRules: [
            { id: "both", minLevel: 1, maxLevel: 100, guildIds: ["1", "2"] },
            { id: "one", minLevel: 1, maxLevel: 100, guildIds: ["1"] },
          ],
        },
      }),
    );

    const result = await boundary.run(
      Effect.gen(function* () {
        const preferences = yield* data.getUserPreferences("user-1");

        const game = yield* data.getUserGameAccountPreferences(
          "user-1",
          "account",
        );

        const ordering = yield* data
          .updateUserPreferences("user-1", { guildsOrder: [] })
          .pipe(Effect.result);

        const routing = yield* data
          .updateUserGameAccountPreferences("user-1", "account", {
            detector: { routingRules: [] },
          })
          .pipe(Effect.result);

        const personal = yield* data.updateUserPreferences("user-1", {
          theme: "anime",
        });

        return { preferences, game, ordering, routing, personal };
      }).pipe(
        Effect.provideService(ForwardAuthIdentity, {
          userId: "user-1",
          discordId: "discord-1",
          apiKey: {
            keyId: "key",
            organizationIds: ["1"],
            personalData: true,
            mode: "read-write",
            expiresAt: null,
          },
        }),
      ),
    );

    expect(result.preferences).toMatchObject({
      guildsOrder: ["1"],
      hiddenGuildIds: [],
    });
    expect(result.game.detector.routingRules.map((rule) => rule.id)).toEqual([
      "one",
    ]);
    expect(result.ordering._tag).toBe("Failure");
    expect(result.routing._tag).toBe("Failure");
    expect(result.personal).toMatchObject({
      theme: "anime",
      guildsOrder: ["1"],
      hiddenGuildIds: [],
    });

    const stored = await boundary.run(
      boundary.database.select().from(userSettingsTable),
    );

    expect(stored[0]?.guildsOrder).toEqual(["1", "2"]);

    const gameStored = await boundary.run(
      boundary.database.select().from(userSettingDocumentTable),
    );

    expect(gameStored).toHaveLength(1);
    expect(gameStored[0]).toMatchObject({
      domain: "gameData",
      scopeType: "GAME_ACCOUNT",
      scopeId: "account",
      overrides: {
        detector: { routingRules: [{ id: "both" }, { id: "one" }] },
      },
    });
  } finally {
    await boundary.dispose();
  }
});
