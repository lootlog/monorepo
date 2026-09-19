import { expect, test } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  userGameAccountSettingsTable,
  userSettingDocumentTable,
} from "#src/database/drizzle/schema";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { makeSettingsDocuments } from "#src/settings-documents/settings-documents.service";
import { makeUserPreferencesData } from "./user-preferences.data-layer.js";

const identity = { userId: "user-1", discordId: "discord-1" };

const setup = async () => {
  const boundary = await createDatabaseBoundary();

  const repository = await boundary.run(
    Effect.service(SettingsDocumentsRepository).pipe(
      Effect.provide(SettingsDocumentsRepository.layerDatabase),
    ),
  );

  const data = makeUserPreferencesData(
    boundary.database,
    makeSettingsDocuments(repository),
  );

  const run = <A, E>(effect: Effect.Effect<A, E, ForwardAuthIdentity>) =>
    boundary.run(Effect.provideService(effect, ForwardAuthIdentity, identity));

  return { boundary, data, run };
};

test("legacy preference routes write only settings documents", async () => {
  const { boundary, data, run } = await setup();

  try {
    await run(
      data.updateUserPreferences(identity.userId, {
        mutes: { npcs: [], players: [{ discordId: "p", displayName: "P" }] },
        chatAppearance: { fontScalePercent: 120 },
      }),
    );

    await run(
      data.updateUserGameAccountPreferences(identity.userId, "account-1", {
        airTags: { enabled: true },
        // A deployed client still sends the server list per type.
        notifications: { TITAN: { sound: true, guildIds: ["guild-1"] } },
      }),
    );

    const legacyRows = await boundary.run(
      boundary.database.select().from(userGameAccountSettingsTable),
    );

    expect(legacyRows).toHaveLength(0);

    const documents = await boundary.run(
      boundary.database.select().from(userSettingDocumentTable),
    );

    expect(
      documents.map((document) => [document.domain, document.scopeType]),
    ).toEqual(
      expect.arrayContaining([
        ["notifications", "USER"],
        ["appearance", "USER"],
        ["gameData", "GAME_ACCOUNT"],
        ["notifications", "GAME_ACCOUNT"],
      ]),
    );

    const preferences = await run(data.getUserPreferences(identity.userId));
    expect(preferences.mutes.players).toEqual([
      { discordId: "p", displayName: "P" },
    ]);
    expect(preferences.chatAppearance.fontScalePercent).toBe(120);

    const game = await run(
      data.getUserGameAccountPreferences(identity.userId, "account-1"),
    );

    expect(game).toMatchObject({
      airTags: { enabled: true },
      notifications: {
        guildIds: ["guild-1"],
        TITAN: { sound: true, guildIds: ["guild-1"] },
        HERO: { guildIds: ["guild-1"] },
      },
      hasStoredAirTags: true,
      hasStoredNotifications: true,
      hasStoredDetector: false,
    });
  } finally {
    await boundary.dispose();
  }
});
