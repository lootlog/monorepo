import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import { RabbitMessaging } from "@lootlog/messaging";

export const makeAmqpAdapter = (rabbit: RabbitMessaging["Service"]) =>
  ({
    publish: (exchange: string, routingKey: string, payload: unknown) =>
      rabbit.publish({
        exchange: exchange as "default",
        routingKey: routingKey as Parameters<
          typeof rabbit.publish
        >[0]["routingKey"],
        content: new TextEncoder().encode(JSON.stringify(payload)),
      }),
  }) satisfies AmqpPublisher;
