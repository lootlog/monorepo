import { expect, test } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { userSettingsTable } from "#src/database/drizzle/user.schema";
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

test("key preferences hide unselected organizations and reject Organization list replacements", async () => {
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

    const result = await boundary.run(
      Effect.gen(function* () {
        const preferences = yield* data.getUserPreferences("user-1");

        const ordering = yield* data
          .updateUserPreferences("user-1", { guildsOrder: [] })
          .pipe(Effect.result);

        const personal = yield* data.updateUserPreferences("user-1", {
          theme: "anime",
        });

        return { preferences, ordering, personal };
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
    expect(result.ordering._tag).toBe("Failure");
    expect(result.personal).toMatchObject({
      theme: "anime",
      guildsOrder: ["1"],
      hiddenGuildIds: [],
    });

    const stored = await boundary.run(
      boundary.database.select().from(userSettingsTable),
    );

    expect(stored[0]?.guildsOrder).toEqual(["1", "2"]);
  } finally {
    await boundary.dispose();
  }
});
