import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
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
} from "#src/database/drizzle/schema";
import {
  type GuildSummary,
  makeAccessibleGuilds,
} from "./accessible-guilds.data-layer.js";

test("repeated guild reads queue one background refresh per stale guild", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const guildIds = ["guild-a", "guild-b"];

    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values(guildIds.map((id) => createGuildFixture({ id }))),
    );
    await boundary.run(
      boundary.database.insert(roleTable).values(
        guildIds.map((guildId) => ({
          id: `role-${guildId}`,
          guildId,
          name: "Member",
          permissions: [Permission.LOOTLOG_ACCESS],
          updatedAt: new Date(0),
        })),
      ),
    );
    // Stored access synced long ago: stale on every read.
    await boundary.run(
      boundary.database.insert(memberTable).values(
        guildIds.map((guildId, index) =>
          createMemberFixture({
            id: index + 1,
            userId: "discord-1",
            guildId,
            globalUserId: "user-1",
            lastDiscordSyncAt: new Date(0),
          }),
        ),
      ),
    );
    await boundary.run(
      boundary.database.insert(memberToRoleTable).values(
        guildIds.map((guildId, index) => ({
          A: index + 1,
          B: `role-${guildId}`,
        })),
      ),
    );

    const cache = new Map<string, GuildSummary[]>();
    const markers = new Set<string>();
    const queued: string[] = [];

    const accessibleGuilds = makeAccessibleGuilds(
      boundary.database,
      {
        getCached: (key) => Effect.sync(() => cache.get(key) ?? null),
        setCached: (key, value) => Effect.sync(() => cache.set(key, value)),
        setIfAbsent: (key) =>
          Effect.sync(() => {
            if (markers.has(key)) return false;
            markers.add(key);

            return true;
          }),
        deleteCached: (key) => Effect.sync(() => markers.delete(key)),
        queueRefresh: ({ guildId }) =>
          Effect.sync(() => {
            queued.push(guildId);
          }),
      },
      RuntimeEnvironment.PROD,
    );

    const identity = { userId: "user-1", discordId: "discord-1" };
    // Covers both enqueue paths: database, cache hit, then database again.
    await boundary.run(accessibleGuilds(identity));
    await boundary.run(accessibleGuilds(identity));
    cache.clear();
    const guilds = await boundary.run(accessibleGuilds(identity));

    expect(queued.toSorted()).toEqual(guildIds);
    expect(guilds).toMatchObject([
      { hasLootlogAccess: true, isAccessDataStale: true },
      { hasLootlogAccess: true, isAccessDataStale: true },
    ]);
  } finally {
    await boundary.dispose();
  }
});
