import { RabbitMessaging } from "@lootlog/messaging";
import { Effect, Layer, Redacted } from "effect";
import { ApiRuntimeConfig } from "./api-runtime-config.js";

export const ApiRabbitLive = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, (config) =>
    RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
    }),
  ),
);
