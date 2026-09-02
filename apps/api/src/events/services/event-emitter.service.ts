import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import { Logger } from "#src/shared/http/http-errors";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";

type EventScope = { guildId: string; eventId: string };

export type EventEmitPayloads = {
  [RoutingKey.EVENT_MAP_STATUS_UPDATE]: EventScope & {
    mapId: string;
    reason?: string;
  };
  [RoutingKey.EVENT_HERO_KILLED]: EventScope & { killId: string };
  [RoutingKey.EVENT_RANKING_UPDATE]: EventScope;
  [RoutingKey.EVENT_RESPAWN_WINDOW_OPENED]: EventScope & { heroId: string };
  [RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED]: EventScope & { heroId: string };
};

export type EventEmitRoutingKey = keyof EventEmitPayloads;

export const makeEventEmitter = (amqpConnection: AmqpPublisher) => {
  const logger = new Logger("EventEmitter");
  const emit = async <K extends EventEmitRoutingKey>(
    routingKey: K,
    payload: EventEmitPayloads[K],
  ): Promise<void> => {
    try {
      await amqpConnection.publish(DEFAULT_EXCHANGE_NAME, routingKey, payload);
    } catch (error) {
      logger.error(`Failed to emit ${routingKey}`, error);
    }
  };

  return { emit };
};

export type EventEmitter = ReturnType<typeof makeEventEmitter>;
