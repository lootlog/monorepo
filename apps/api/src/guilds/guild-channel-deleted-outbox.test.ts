import { expect, it } from "bun:test";
import type {
  DiscordGuildChannel,
  DiscordGuildSyncState,
} from "@lootlog/schema/discord";
import { Effect } from "effect";
import { discordGuildChannelDeletedOutboxTable } from "#src/database/drizzle/discord-guild-channel-deleted-outbox.schema";
import {
  discordGuildChannelSnapshotTable,
  guildTable,
} from "#src/database/drizzle/organization.schema";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import {
  makeGuildChannelDeletedDispatcher,
  type GuildChannelDeletedEvent,
} from "./guild-channel-deleted-outbox.js";
import { makeGuildDiscordSyncData } from "./guild-discord-sync.data-layer.js";

const channel = (guildId: string, channelId: string): DiscordGuildChannel => ({
  guildId,
  channelId,
  name: channelId,
  channelType: "GUILD_TEXT",
  parentId: null,
  position: 0,
  active: true,
  canView: true,
  canSend: true,
  hasRequiredPermissions: true,
  requiredPermissions: [],
  grantedPermissions: [],
  missingPermissions: [],
  lastSyncedAt: "2026-11-18T10:00:00.000Z",
});

it("keeps a channel deletion committed by a refresh until a later dispatch publishes it", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const guild = createGuildFixture();

    const syncState: DiscordGuildSyncState = {
      guildId: guild.id,
      status: "SYNCED",
      hasRequiredPermissions: true,
      requiredPermissions: [],
      grantedPermissions: [],
      missingPermissions: [],
      channelCount: 1,
      selectableChannelCount: 1,
      lastAttemptAt: "2026-11-18T10:00:00.000Z",
      lastSuccessAt: "2026-11-18T10:00:00.000Z",
      lastError: null,
      updatedAt: "2026-11-18T10:00:00.000Z",
    };

    const kept = channel(guild.id, "kept");
    const removed = channel(guild.id, "removed");

    await boundary.run(database.insert(guildTable).values(guild));
    await boundary.run(
      database.insert(discordGuildChannelSnapshotTable).values(
        [kept, removed].map(({ channelId }) => ({
          guildId: guild.id,
          channelId,
          name: channelId,
          channelType: "GUILD_TEXT",
          position: 0,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })),
      ),
    );

    const sync = makeGuildDiscordSyncData(database, {
      staleAfterMs: 60_000,
      refresh: () => Effect.succeed({ channels: [kept], syncState }),
      signalChannelDeletions: Effect.void,
    });

    await boundary.run(sync.refreshGuildDiscordSync(guild.id));

    expect(
      await boundary.run(
        database
          .select({ channelId: discordGuildChannelSnapshotTable.channelId })
          .from(discordGuildChannelSnapshotTable),
      ),
    ).toEqual([{ channelId: "kept" }]);

    let rabbitAvailable = false;
    const published: Array<[GuildChannelDeletedEvent, string]> = [];

    const dispatch = makeGuildChannelDeletedDispatcher(
      database,
      (event, messageId) =>
        rabbitAvailable
          ? Effect.sync(() => published.push([event, messageId]))
          : Effect.fail("RabbitMQ unavailable"),
    );

    await boundary.run(dispatch());
    expect(published).toEqual([]);
    expect(
      await boundary.run(
        database.select().from(discordGuildChannelDeletedOutboxTable),
      ),
    ).toMatchObject([
      {
        guildId: guild.id,
        channelId: "removed",
        lastAttemptAt: expect.any(Date),
      },
    ]);

    rabbitAvailable = true;
    await boundary.run(dispatch());
    expect(published).toEqual([
      [
        { guildId: guild.id, channelId: "removed", syncState },
        expect.stringMatching(/^discord-guild-channel-deleted:\d+$/),
      ],
    ]);
    expect(
      await boundary.run(
        database.select().from(discordGuildChannelDeletedOutboxTable),
      ),
    ).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});
