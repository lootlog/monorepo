import type { RabbitMQConfig } from "@golevelup/nestjs-rabbitmq";
import { env } from "./env.js";

export const DEFAULT_EXCHANGE_NAME = "default";

export const rabbitmqConfig: RabbitMQConfig = {
  uri: env.RABBITMQ_URI,
  exchanges: [{ name: DEFAULT_EXCHANGE_NAME, type: "topic" }],
  channels: {
    default: {
      prefetchCount: 1,
      default: true,
    },
  },
};
