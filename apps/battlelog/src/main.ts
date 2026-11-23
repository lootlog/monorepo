import { runService } from "@lootlog/instrumentation/service";
import { RabbitMessaging } from "@lootlog/messaging";
import { Effect, Layer, Redacted } from "effect";
import { BattlelogApplication } from "#src/battlelog-application";
import { BattlelogConfig } from "#src/config/env";
import { BattlelogHttpServer } from "#src/http/battlelog-http";
import {
  battlelogQueues,
  DeleteUserDataConsumer,
} from "#src/messaging/delete-user-data-consumer";

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* BattlelogConfig;

    return RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
      queues: [...battlelogQueues],
    });
  }),
).pipe(Layer.provide(BattlelogConfig.layer));

runService({
  config: BattlelogConfig.pipe(Effect.provide(BattlelogConfig.layer)),
  application: Layer.mergeAll(BattlelogHttpServer, DeleteUserDataConsumer).pipe(
    Layer.provide(BattlelogApplication.layer),
    Layer.provide(RabbitLive),
  ),
  supervise: RabbitMessaging.supervised,
});
