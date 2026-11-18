import { expect, test } from "bun:test";
import type { DiscordGuildSyncState } from "@lootlog/schema/discord";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import {
  discordGuildSyncStateTable,
  guildTable,
} from "#src/database/drizzle/organization.schema";
import { RateLimitedError } from "#src/shared/http/http-errors";
import { makeGuildDiscordSyncData } from "./guild-discord-sync.data-layer.js";

const guildId = "guild-1";

const syncedState = (now: Date): DiscordGuildSyncState => ({
  guildId,
  status: "SYNCED",
  hasRequiredPermissions: true,
  requiredPermissions: [],
  grantedPermissions: [],
  missingPermissions: [],
  channelCount: 0,
  selectableChannelCount: 0,
  lastAttemptAt: now.toISOString(),
  lastSuccessAt: now.toISOString(),
  lastError: null,
  updatedAt: now.toISOString(),
});

// The last attempt was a minute ago; a later state-only write (a gateway
// event) touched the row ten seconds ago.
const refreshOneMinuteAfterAttempt = async (
  status: DiscordGuildSyncState["status"],
  lastError: string | null,
) => {
  const boundary = await createDatabaseBoundary();

  try {
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    await boundary.run(
      boundary.database.insert(guildTable).values(createGuildFixture()),
    );
    await boundary.run(
      boundary.database.insert(discordGuildSyncStateTable).values({
        guildId,
        status,
        hasRequiredPermissions: false,
        lastAttemptAt: oneMinuteAgo,
        lastError,
        updatedAt: tenSecondsAgo,
      }),
    );

    let botCalls = 0;

    const sync = makeGuildDiscordSyncData(boundary.database, {
      staleAfterMs: 60 * 60 * 1000,
      refresh: () =>
        Effect.sync(() => {
          botCalls += 1;

          return { channels: [], syncState: syncedState(new Date()) };
        }),
      publishChannelDeleted: () => Effect.void,
    });

    const result = await boundary.run(
      sync.refreshGuildDiscordSync(guildId).pipe(
        Effect.match({
          onSuccess: (state) => ({ refreshed: state, refusedWith: null }),
          onFailure: (error) => ({
            refreshed: null,
            refusedWith:
              error.cause instanceof RateLimitedError
                ? error.cause.body.code
                : error.cause,
          }),
        }),
      ),
    );

    return { result, botCalls };
  } finally {
    await boundary.dispose();
  }
};

test.each([
  ["a failed sync", "FAILED", "resolveGuild: connect ECONNREFUSED"],
  ["a server the bot was missing from", "NOT_FOUND", "Guild not found"],
  ["a snapshot staled by a bot role change", "STALE", null],
] as const)(
  "%s can be retried without waiting out the full cooldown",
  async (_, status, lastError) => {
    const { result, botCalls } = await refreshOneMinuteAfterAttempt(
      status,
      lastError,
    );

    expect(botCalls).toBe(1);
    expect(result.refreshed).toMatchObject({
      status: "SYNCED",
      hasRequiredPermissions: true,
    });
  },
);

test("a confirmed Discord sync keeps manual refreshes spaced out", async () => {
  const { result, botCalls } = await refreshOneMinuteAfterAttempt(
    "SYNCED",
    null,
  );

  expect(botCalls).toBe(0);
  expect(result.refusedWith).toBe("DISCORD_SYNC_REFRESH_COOLDOWN");
});
