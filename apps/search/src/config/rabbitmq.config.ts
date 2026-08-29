import type { RabbitMQConfig } from "@golevelup/nestjs-rabbitmq";
import { env } from "#src/config/env";

export const DEFAULT_EXCHANGE_NAME = "default";
const isOpenApiGeneration = process.env.OPENAPI_GENERATION === "true";

export const rabbitmqConfig: RabbitMQConfig = {
  uri: env.RABBITMQ_URI,
  exchanges: [{ name: DEFAULT_EXCHANGE_NAME, type: "topic" }],
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
