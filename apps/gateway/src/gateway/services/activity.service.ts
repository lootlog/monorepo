import { Injectable, Logger } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { ActivityType } from "src/gateway/enums/activity-type.enum";
import { ActivitySource } from "src/gateway/enums/activity-source.enum";
import { Platform } from "src/gateway/enums/platform.enum";
import { RoutingKey } from "src/gateway/enums/routing-key.enum";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import type { Socket } from "src/gateway/types/socket-user.type";
import type { UserGuildData } from "src/guilds/types/guild.types";

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private amqpConnection: AmqpConnection) {}

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
          await this.amqpConnection.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.ACTIVITY_LOG_CREATE,
            payload,
          );
        } catch (error) {
          this.logger.error(
            `Failed to publish ${type} for ${discordId} in guild ${guild.id}: ${error.message}`,
            error.stack,
          );
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
