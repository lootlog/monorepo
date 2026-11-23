import { runService } from "@lootlog/instrumentation/service";
import { RabbitMessaging } from "@lootlog/messaging";
import { battlelogUserDataDeleteRoute } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Redacted } from "effect";
import { BattlelogApplication } from "#src/battlelog-application";
import { BattlelogConfig } from "#src/config/env";
import { BattlelogHttpServer } from "#src/http/battlelog-http";
import { UserDataDeletionConsumer } from "#src/messaging/user-data-deletion-consumer";

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* BattlelogConfig;

    return RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
      queues: battlelogUserDataDeleteRoute.queues,
    });
  }),
).pipe(Layer.provide(BattlelogConfig.layer));

runService({
  config: BattlelogConfig.pipe(Effect.provide(BattlelogConfig.layer)),
  application: Layer.mergeAll(
    BattlelogHttpServer,
    UserDataDeletionConsumer,
  ).pipe(Layer.provide(BattlelogApplication.layer), Layer.provide(RabbitLive)),
  supervise: RabbitMessaging.supervised,
});
