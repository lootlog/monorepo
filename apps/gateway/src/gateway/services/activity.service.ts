import { DEFAULT_EXCHANGE_NAME } from "../../config/rabbitmq.config.js";
import { ActivitySource } from "../enums/activity-source.enum.js";
import { ActivityType } from "../enums/activity-type.enum.js";
import { Platform } from "../enums/platform.enum.js";
import { RoutingKey } from "../enums/routing-key.enum.js";
import type { Socket } from "../types/socket-user.type.js";
import type { AmqpPublisher } from "../rabbitmq/amqp-publisher.js";
import type { UserGuildData } from "../../guilds/types/guild.types.js";

export class ActivityService {
  constructor(
    private readonly amqpPublisher: AmqpPublisher,
    private readonly logger: {
      error(message: string, meta?: Record<string, unknown>): void;
    },
  ) {}

  async publishActivityEvent(
    type: ActivityType.CONNECT_EVENT | ActivityType.DISCONNECT_EVENT,
    client: Socket,
    guilds: UserGuildData[],
  ): Promise<void> {
    const { discordId, userId, sessionId, platform, player } = client.data;

    if (!player) {
      return;
    }

    const source =
      platform === Platform.GAME ? ActivitySource.GAME : ActivitySource.WEB_APP;
    const timestamp = Date.now();

    await Promise.all(
      guilds.map(async ({ guild }) => {
        const payload = this.buildActivityPayload({
          type,
          userId,
          guildId: guild.id,
          discordId,
          source,
          player,
          sessionId,
          userAgent: client.request.headers["user-agent"],
          timestamp,
        });

        try {
          await this.amqpPublisher.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.ACTIVITY_LOG_CREATE,
            payload,
          );
        } catch (error) {
          this.logger.error("Failed to publish activity event", {
            type,
            discordId,
            guildId: guild.id,
            error,
          });
        }
      }),
    );
  }

  private buildActivityPayload({
    type,
    userId,
    guildId,
    discordId,
    source,
    player,
    sessionId,
    userAgent,
    timestamp,
  }: {
    type: ActivityType;
    userId: string | undefined;
    guildId: string;
    discordId: string;
    source: ActivitySource;
    player: NonNullable<Socket["data"]["player"]>;
    sessionId: string;
    userAgent: string | undefined;
    timestamp: number;
  }) {
    return {
      userId,
      guildId,
      discordId,
      type,
      source,
      world: player.world,
      details: {
        sessionId,
        userAgent,
      },
      actorSnapshot:
        source === ActivitySource.GAME
          ? {
              accountId: Number(player.accountId),
              characterId: Number(player.characterId),
              clanName: player.clanName ?? "",
              name: player.name,
              clanId: player.clanId ?? 0,
              icon: player.icon,
              lvl: Number(player.lvl),
              prof: player.prof,
            }
          : undefined,
      idempotencyKey: `${type.toLowerCase()}_${sessionId}_${guildId}_${timestamp}`,
    };
  }
}
