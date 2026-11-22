import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import type { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { discordGuildChannelDeletedOutboxTable } from "#src/database/drizzle/discord-guild-channel-deleted-outbox.schema";
import { makeOutboxDispatcher } from "#src/shared/outbox-worker";

export type GuildChannelDeletedEvent = CanonicalRabbitEvent<
  typeof RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED
>;

export const makeGuildChannelDeletedDispatcher = <E>(
  database: typeof ApiDatabase.Service,
  publish: (
    event: GuildChannelDeletedEvent,
    messageId: string,
  ) => Effect.Effect<void, E>,
) =>
  makeOutboxDispatcher(
    "DiscordGuildChannelDeletedOutbox",
    database,
    discordGuildChannelDeletedOutboxTable,
    (row) =>
      publish(
        {
          guildId: row.guildId,
          channelId: row.channelId,
          syncState: row.syncState,
        },
        `discord-guild-channel-deleted:${row.id}`,
      ),
  );
