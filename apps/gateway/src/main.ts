import { runService } from "@lootlog/instrumentation/service";
import { RabbitMessaging } from "@lootlog/messaging";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { GatewayServer } from "#src/app";
import { GatewayConfig } from "#src/config/gateway-config";

runService({
  config: GatewayConfig.pipe(Effect.provide(GatewayConfig.layer)),
  application: GatewayServer.pipe(Layer.provide(FetchHttpClient.layer)),
  supervise: RabbitMessaging.supervised,
});
