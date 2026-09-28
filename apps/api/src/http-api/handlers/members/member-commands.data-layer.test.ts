import { expect, test } from "bun:test";
import { Effect } from "effect";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import { guildTable, memberTable } from "#src/database/drizzle/schema";
import { makeMembersDataLayer } from "./member-commands.data-layer.js";
import { MembersData } from "./members.handlers.js";

const HOUR_MS = 60 * 60 * 1000;

test("member reads queue a refresh within the stale grace and wait on Discord after it", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "guild-recent" }),
          createGuildFixture({ id: "guild-expired" }),
        ]),
    );
    await boundary.run(
      boundary.database.insert(memberTable).values([
        createMemberFixture({
          id: 1,
          userId: "discord-1",
          guildId: "guild-recent",
          globalUserId: "user-1",
          lastDiscordSyncAt: new Date(Date.now() - HOUR_MS),
        }),
        createMemberFixture({
          id: 2,
          userId: "discord-1",
          guildId: "guild-expired",
          globalUserId: "user-1",
          lastDiscordSyncAt: new Date(Date.now() - 7 * HOUR_MS),
        }),
      ]),
    );

    const refreshed: string[] = [];
    const queued: string[] = [];

    const layer = makeMembersDataLayer(
      {
        refreshGuildMember: ({ guildId }) =>
          Effect.sync(() => {
            refreshed.push(guildId);

            return {
              member: null,
              status: "NOT_FOUND" as const,
              refreshQueued: false,
              nextRefreshAt: null,
            };
          }),
        queueGuildMemberRefresh: ({ guildId }) =>
          Effect.sync(() => {
            queued.push(guildId);

            return { queued: true, nextRefreshAt: null };
          }),
        recordStaleUse: () => Effect.void,
        clearMemberCaches: () => Effect.void,
        publishMemberRemoved: () => Effect.void,
        enqueueBulkRefresh: () => Effect.void,
        publishRefreshJobUpdate: () => Effect.void,
      },
      RuntimeEnvironment.PROD,
    );

    const getMe = (guildId: string) =>
      boundary.run(
        Effect.gen(function* () {
          const members = yield* MembersData;

          return yield* members.getMe(
            { userId: "user-1", discordId: "discord-1" },
            guildId,
            false,
          );
        }).pipe(Effect.provide(layer)),
      );

    expect(await getMe("guild-recent")).toMatchObject({
      guildId: "guild-recent",
      isStale: true,
      refreshQueued: true,
    });
    expect(refreshed).toEqual([]);
    expect(queued).toEqual(["guild-recent"]);

    // Past the grace, access depends on the synchronous Discord answer.
    expect(await getMe("guild-expired")).toBeNull();
    expect(refreshed).toEqual(["guild-expired"]);
  } finally {
    await boundary.dispose();
  }
});
