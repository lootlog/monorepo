import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import { RabbitMessaging } from "@lootlog/messaging";

export const makeAmqpAdapter = (rabbit: RabbitMessaging["Service"]) =>
  ({
    publish: (exchange, routingKey, payload) =>
      rabbit.publish({
        exchange: exchange,
        routingKey: routingKey,
        content: new TextEncoder().encode(JSON.stringify(payload)),
      }),
  }) satisfies AmqpPublisher;
