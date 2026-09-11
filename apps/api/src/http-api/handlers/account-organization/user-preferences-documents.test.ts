import { expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  userGameAccountSettingsTable,
  userSettingDocumentTable,
} from "#src/database/drizzle/schema";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { makeSettingsDocuments } from "#src/settings-documents/settings-documents.service";
import { makeUserPreferencesData } from "./user-preferences.data-layer.js";

const backfillStatements = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../drizzle/migrations/20260910185220_settings_documents_backfill/migration.sql",
      import.meta.url,
    ),
  ),
  "utf8",
).split("--> statement-breakpoint");

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

  const runBackfill = async () => {
    for (const statement of backfillStatements) {
      await boundary.run(boundary.database.execute(sql.raw(statement)));
    }
  };

  return { boundary, data, run, runBackfill };
};

test("backfilled legacy preferences are served from settings documents and existing documents win on rerun", async () => {
  const { boundary, data, run, runBackfill } = await setup();

  try {
    await boundary.run(
      boundary.database.insert(userGameAccountSettingsTable).values([
        {
          userId: identity.userId,
          accountId: "account-1",
          settings: {
            pings: { enabled: true },
            detector: {
              routingRules: [
                { id: "rule", minLevel: 1, maxLevel: 50, guildIds: ["1"] },
              ],
              HERO: { detect: false },
            },
            // Legacy shape: the server list lived inside every type.
            notifications: { HERO: { show: false, guildIds: ["1"] } },
          },
          updatedAt: new Date(0),
        },
        {
          userId: identity.userId,
          accountId: "__global-notification-mutes__",
          settings: {
            mutes: { players: [{ discordId: "muted", displayName: "M" }] },
          },
          updatedAt: new Date(0),
        },
      ]),
    );

    await runBackfill();

    const first = await run(
      data.getUserGameAccountPreferences(identity.userId, "account-1"),
    );

    expect(first).toMatchObject({
      pings: { enabled: true },
      detector: {
        routingRules: [{ id: "rule", minLevel: 1, maxLevel: 50 }],
        HERO: { detect: false },
      },
      notifications: { guildIds: ["1"], HERO: { show: false } },
      hasStoredPings: true,
      hasStoredDetector: true,
      hasStoredNotifications: true,
      hasStoredAirTags: false,
    });

    const preferences = await run(data.getUserPreferences(identity.userId));
    expect(preferences.mutes.players).toEqual([
      { discordId: "muted", displayName: "M" },
    ]);

    await run(
      data.updateUserGameAccountPreferences(identity.userId, "account-1", {
        pings: { enabled: false },
        notifications: { HERO: { sound: true } },
      }),
    );

    // The patch stores the document in the current schema: the shared list
    // is lifted and the per-type lists are gone.
    const [notificationsDocument] = await boundary.run(
      boundary.database
        .select()
        .from(userSettingDocumentTable)
        .where(
          and(
            eq(userSettingDocumentTable.domain, "notifications"),
            eq(userSettingDocumentTable.scopeType, "GAME_ACCOUNT"),
          ),
        ),
    );

    expect(notificationsDocument?.schemaVersion).toBe(2);
    expect(notificationsDocument?.overrides).toMatchObject({
      presentation: { guildIds: ["1"], HERO: { show: false, sound: true } },
    });
    expect(
      JSON.stringify(notificationsDocument?.overrides).match(/guildIds/g),
    ).toHaveLength(1);

    await runBackfill();

    const afterRerun = await run(
      data.getUserGameAccountPreferences(identity.userId, "account-1"),
    );

    expect(afterRerun.pings).toEqual({ enabled: false });

    const documents = await boundary.run(
      boundary.database.select().from(userSettingDocumentTable),
    );

    expect(
      documents.map((document) => [
        document.domain,
        document.scopeType,
        document.scopeId,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["gameData", "GAME_ACCOUNT", "account-1"],
        ["notifications", "GAME_ACCOUNT", "account-1"],
        ["notifications", "USER", identity.userId],
      ]),
    );
    expect(documents).toHaveLength(3);
  } finally {
    await boundary.dispose();
  }
});

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
        notifications: { TITAN: { sound: true } },
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
      notifications: { TITAN: { sound: true } },
      hasStoredAirTags: true,
      hasStoredNotifications: true,
      hasStoredDetector: false,
    });
  } finally {
    await boundary.dispose();
  }
});
