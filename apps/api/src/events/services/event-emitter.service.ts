import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";

@Injectable()
export class EventEmitterService {
  private readonly logger = new Logger(EventEmitterService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async emitMapStatusUpdate(
    guildId: string,
    eventId: string,
    mapId: string,
    reason?: string,
  ): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_MAP_STATUS_UPDATE,
        {
          guildId,
          eventId,
          mapId,
          reason,
        },
      );
    } catch (error) {
      this.logger.error("Failed to emit map status update", error);
    }
  }

  async emitHeroKilled(
    guildId: string,
    eventId: string,
    killId: string,
  ): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_HERO_KILLED,
        {
          guildId,
          eventId,
          killId,
        },
      );
    } catch (error) {
      this.logger.error("Failed to emit hero killed event", error);
    }
  }

  async emitRankingUpdate(guildId: string, eventId: string): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_RANKING_UPDATE,
        {
          guildId,
          eventId,
        },
      );
    } catch (error) {
      this.logger.error("Failed to emit ranking update event", error);
    }
  }

  async emitRespawnWindowOpened(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
        { guildId, eventId, heroId },
      );
    } catch (error) {
      this.logger.error("Failed to emit respawn window opened event", error);
    }
  }

  async emitRespawnWindowClosed(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
        { guildId, eventId, heroId },
      );
    } catch (error) {
      this.logger.error("Failed to emit respawn window closed event", error);
    }
  }

  async emitTimerUpdate(timer: unknown): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_TIMERS_UPDATE,
        timer,
      );
    } catch (error) {
      this.logger.error("Failed to emit timer update", error);
    }
  }
}
