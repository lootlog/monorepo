import { expect, it } from "bun:test";
import { Client } from "pg";

it("normalizes legacy NULL arrays before enforcing the Drizzle schema", async () => {
  const client = new Client({
    connectionString: process.env.POSTGRESQL_CONNECTION_URI,
  });
  await client.connect();

  try {
    await client.query(`
      ALTER TABLE "DiscordGuildChannelSnapshot"
        ALTER COLUMN "grantedPermissions" DROP NOT NULL,
        ALTER COLUMN "missingPermissions" DROP NOT NULL,
        ALTER COLUMN "requiredPermissions" DROP NOT NULL;
      ALTER TABLE "DiscordGuildSyncState"
        ALTER COLUMN "grantedPermissions" DROP NOT NULL,
        ALTER COLUMN "missingPermissions" DROP NOT NULL,
        ALTER COLUMN "requiredPermissions" DROP NOT NULL;
      ALTER TABLE "LootlogConfigNpc" ALTER COLUMN "allowedRarities" DROP NOT NULL;
      ALTER TABLE "Role" ALTER COLUMN "permissions" DROP NOT NULL;
      ALTER TABLE "UserGuildTimerSettings"
        ALTER COLUMN "hiddenTimers" DROP NOT NULL,
        ALTER COLUMN "pinnedTimers" DROP NOT NULL;
      ALTER TABLE "UserSettings" ALTER COLUMN "guildsOrder" DROP NOT NULL;

      SET session_replication_role = replica;
      INSERT INTO "DiscordGuildChannelSnapshot"
        ("guildId", "channelId", "name", "channelType", "position", "lastSyncedAt", "updatedAt",
         "grantedPermissions", "missingPermissions", "requiredPermissions")
      VALUES ('review-guild', 'review-channel', 'Review', 'text', 0, now(), now(), NULL, NULL, NULL);
      INSERT INTO "DiscordGuildSyncState"
        ("guildId", "updatedAt", "grantedPermissions", "missingPermissions", "requiredPermissions")
      VALUES ('review-guild', now(), NULL, NULL, NULL);
      INSERT INTO "LootlogConfigNpc" ("lootlogConfigId", "npcType", "allowedRarities", "updatedAt")
      VALUES ('review-config', 'NPC', NULL, now());
      INSERT INTO "Role" ("id", "guildId", "name", "permissions", "updatedAt")
      VALUES ('review-role', 'review-guild', 'Review', NULL, now());
      INSERT INTO "UserGuildTimerSettings"
        ("userId", "guildId", "hiddenTimers", "pinnedTimers", "updatedAt")
      VALUES ('review-user', 'review-guild', NULL, NULL, now());
      INSERT INTO "UserSettings" ("userId", "guildsOrder", "updatedAt")
      VALUES ('review-user', NULL, now());
      SET session_replication_role = origin;
    `);

    const migration = await Bun.file(
      new URL(
        "../drizzle/migrations/20260904070709_finish_drizzle_adoption/migration.sql",
        import.meta.url,
      ),
    ).text();
    await client.query(migration);

    const values = await client.query(`
      SELECT
        (SELECT "grantedPermissions" FROM "DiscordGuildChannelSnapshot" WHERE "channelId" = 'review-channel') AS "channelGranted",
        (SELECT "missingPermissions" FROM "DiscordGuildSyncState" WHERE "guildId" = 'review-guild') AS "syncMissing",
        (SELECT "allowedRarities" FROM "LootlogConfigNpc" WHERE "lootlogConfigId" = 'review-config') AS rarities,
        (SELECT "permissions" FROM "Role" WHERE "id" = 'review-role') AS permissions,
        (SELECT "hiddenTimers" FROM "UserGuildTimerSettings" WHERE "userId" = 'review-user') AS "hiddenTimers",
        (SELECT "guildsOrder" FROM "UserSettings" WHERE "userId" = 'review-user') AS "guildsOrder"
    `);
    expect(values.rows[0]).toEqual({
      channelGranted: [],
      syncMissing: [],
      rarities: "{}",
      permissions: "{}",
      hiddenTimers: [],
      guildsOrder: [],
    });

    const nullableColumns = await client.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND is_nullable = 'YES'
        AND (table_name, column_name) IN (
          ('DiscordGuildChannelSnapshot', 'grantedPermissions'),
          ('DiscordGuildChannelSnapshot', 'missingPermissions'),
          ('DiscordGuildChannelSnapshot', 'requiredPermissions'),
          ('DiscordGuildSyncState', 'grantedPermissions'),
          ('DiscordGuildSyncState', 'missingPermissions'),
          ('DiscordGuildSyncState', 'requiredPermissions'),
          ('LootlogConfigNpc', 'allowedRarities'),
          ('Role', 'permissions'),
          ('UserGuildTimerSettings', 'hiddenTimers'),
          ('UserGuildTimerSettings', 'pinnedTimers'),
          ('UserSettings', 'guildsOrder')
        )
    `);
    expect(nullableColumns.rows[0]?.count).toBe("0");
  } finally {
    await client.end();
  }
});
