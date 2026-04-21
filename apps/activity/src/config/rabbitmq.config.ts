import type { RabbitMQConfig } from "@golevelup/nestjs-rabbitmq";
import { env } from "src/config/env";
import { Queue } from "src/enum/queue.enum";
import { RoutingKey } from "src/enum/routing-key.enum";

export const DEFAULT_EXCHANGE_NAME = "default";
export const DEAD_LETTER_EXCHANGE_NAME = "dlx";
export const RETRY_EXCHANGE_NAME = "retry";
const isOpenApiGeneration = process.env.OPENAPI_GENERATION === "true";

const DEFAULT_TTL = 30000; // 30 seconds

export const rabbitmqConfig: RabbitMQConfig = {
  uri: env.RABBITMQ_URI,
  exchanges: [
    { name: DEFAULT_EXCHANGE_NAME, type: "topic" },
    {
      name: DEAD_LETTER_EXCHANGE_NAME,
      type: "topic",
    },
    {
      name: RETRY_EXCHANGE_NAME,
      type: "topic",
    },
  ],
  queues: [
    {
      name: Queue.ACTIVITY_LOG_CREATE_RETRY,
      exchange: RETRY_EXCHANGE_NAME,
      routingKey: RoutingKey.ACTIVITY_LOG_CREATE_RETRY,
      options: {
        durable: true,
        messageTtl: DEFAULT_TTL,
        deadLetterExchange: DEFAULT_EXCHANGE_NAME,
        deadLetterRoutingKey: RoutingKey.ACTIVITY_LOG_CREATE,
      },
    },
  ],
  channels: {
    default: {
      prefetchCount: 1,
      default: true,
    },
  },
  connectionInitOptions: isOpenApiGeneration
    ? {
        wait: false,
        reject: false,
        skipConnectionFailedLogging: true,
        skipDisconnectFailedLogging: true,
      }
    : {},
  registerHandlers: !isOpenApiGeneration,
  enableControllerDiscovery: !isOpenApiGeneration,
};
