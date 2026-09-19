import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import { Logger } from "#src/shared/application-logger";
import {
  RabbitExchange,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";

type EventScope = { guildId: string; eventId: string };

export type EventEmitPayloads = {
  [RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE]: EventScope & {
    heroNpcLvl: number | null;
    mapId: string;
    reason?: string;
  };
  [RabbitRoutingKey.EVENT_HERO_KILLED]: EventScope & {
    killId: string;
    heroNpcLvl: number | null;
  };
  [RabbitRoutingKey.EVENT_RANKING_UPDATE]: EventScope;
  [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED]: EventScope & {
    heroId: string;
    heroNpcLvl: number | null;
  };
  [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED]: EventScope & {
    heroId: string;
    heroNpcLvl: number | null;
  };
};

export type EventEmitRoutingKey = keyof EventEmitPayloads;

export const makeEventEmitter = (amqpConnection: AmqpPublisher) => {
  const logger = new Logger("EventEmitter");

  const emit = <K extends EventEmitRoutingKey>(
    routingKey: K,
    payload: EventEmitPayloads[K],
  ): Effect.Effect<void> =>
    amqpConnection.publish(RabbitExchange.DEFAULT, routingKey, payload).pipe(
      Effect.catch((error) =>
        Effect.sync(() => logger.error(`Failed to emit ${routingKey}`, error)),
      ),
      Effect.asVoid,
    );

  return { emit };
};

export type EventEmitter = ReturnType<typeof makeEventEmitter>;
