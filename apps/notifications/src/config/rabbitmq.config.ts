import { registerAs } from "@nestjs/config";
import type { RabbitMQConfig } from "@golevelup/nestjs-rabbitmq";
import { ConfigKey } from "src/config/config-key.enum";
import { Queue } from "src/notifications/enums/queue.enum";
import { RoutingKey } from "src/notifications/enums/routing-key.enum";

export const DEFAULT_EXCHANGE_NAME = "default";

export default registerAs(ConfigKey.RABBITMQ, (): RabbitMQConfig => {
  const { RABBITMQ_URI } = process.env;

  return {
    uri: RABBITMQ_URI,
    exchanges: [{ name: DEFAULT_EXCHANGE_NAME, type: "topic" }],
    queues: [
      {
        name: Queue.NOTIFICATIONS_GUILD_SEND_COMMAND,
        exchange: DEFAULT_EXCHANGE_NAME,
        routingKey: RoutingKey.NOTIFICATIONS_GUILD_SEND_COMMAND,
        options: {
          durable: true,
        },
      },
    ],
    channels: {
      default: {
        prefetchCount: 1,
        default: true,
      },
    },
    connectionInitOptions: {},
  };
});
