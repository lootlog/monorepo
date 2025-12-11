import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';

/**
 * Service responsible for publishing event-related messages to RabbitMQ.
 * Centralizes all event broadcasting for map status, presence, kills, and respawn windows.
 */
@Injectable()
export class EventEmitterService {
  private readonly logger = new Logger(EventEmitterService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Emit map status update when assignments change.
   */
  async emitMapStatusUpdate(
    guildId: string,
    eventId: string,
    mapId: string,
    mapName: string,
  ): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_MAP_STATUS_UPDATE,
        {
          guildId,
          eventId,
          mapId,
          mapName,
        },
      );
    } catch (error) {
      this.logger.error('Failed to emit map status update', error);
    }
  }

  /**
   * Emit hero killed event when an event hero is killed.
   */
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
      this.logger.error('Failed to emit hero killed event', error);
    }
  }

  /**
   * Emit respawn window opened event.
   */
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
      this.logger.error('Failed to emit respawn window opened event', error);
    }
  }

  /**
   * Emit respawn window closed event.
   */
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
      this.logger.error('Failed to emit respawn window closed event', error);
    }
  }

  /**
   * Emit timer update for the gateway/frontend.
   * Used when manually opening a respawn window.
   */
  async emitTimerUpdate(timer: unknown): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_TIMERS_UPDATE,
        timer,
      );
    } catch (error) {
      this.logger.error('Failed to emit timer update', error);
    }
  }
}
