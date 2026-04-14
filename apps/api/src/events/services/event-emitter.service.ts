import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";

@Injectable()
export class EventEmitterService {
  private readonly logger = new Logger(EventEmitterService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  private async publish(
    routingKey: RoutingKey,
    payload: unknown,
    label: string,
  ): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        routingKey,
        payload,
      );
    } catch (error) {
      this.logger.error(`Failed to emit ${label}`, error);
    }
  }

  async emitMapStatusUpdate(
    guildId: string,
    eventId: string,
    mapId: string,
    reason?: string,
  ): Promise<void> {
    await this.publish(
      RoutingKey.EVENT_MAP_STATUS_UPDATE,
      { guildId, eventId, mapId, reason },
      "map status update",
    );
  }

  async emitHeroKilled(
    guildId: string,
    eventId: string,
    killId: string,
  ): Promise<void> {
    await this.publish(
      RoutingKey.EVENT_HERO_KILLED,
      { guildId, eventId, killId },
      "hero killed event",
    );
  }

  async emitRankingUpdate(guildId: string, eventId: string): Promise<void> {
    await this.publish(
      RoutingKey.EVENT_RANKING_UPDATE,
      { guildId, eventId },
      "ranking update event",
    );
  }

  async emitRespawnWindowOpened(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<void> {
    await this.publish(
      RoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
      { guildId, eventId, heroId },
      "respawn window opened event",
    );
  }

  async emitRespawnWindowClosed(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<void> {
    await this.publish(
      RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
      { guildId, eventId, heroId },
      "respawn window closed event",
    );
  }

  async emitTimerUpdate(timer: unknown): Promise<void> {
    await this.publish(RoutingKey.GUILDS_TIMERS_UPDATE, timer, "timer update");
  }
}
