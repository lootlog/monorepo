import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import type { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { discordGuildChannelDeletedOutboxTable } from "#src/database/drizzle/discord-guild-channel-deleted-outbox.schema";
import { makeOutboxDispatcher } from "#src/shared/outbox-worker";

export type GuildChannelDeletedEvent = CanonicalRabbitEvent<
  typeof RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED
>;

/**
 * Publishes committed channel deletions. A broker-confirmed row that was not
 * yet deleted is replayed under the same message id, and consumers remove the
 * snapshot and notification target idempotently.
 */
export const makeGuildChannelDeletedDispatcher = (
  database: typeof ApiDatabase.Service,
  publish: (
    event: GuildChannelDeletedEvent,
    messageId: string,
  ) => Effect.Effect<unknown, unknown>,
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
