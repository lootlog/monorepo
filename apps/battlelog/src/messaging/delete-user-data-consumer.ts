import { RabbitMessaging } from "@lootlog/messaging";
import { BattlelogUserDataDelete } from "@lootlog/protocol/rabbit/events";
import {
  consumerRoute,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Schema } from "effect";
import { BattlelogApplication } from "#src/battlelog-application";

const deleteUserDataRoute = consumerRoute(
  "battlelog-delete-user-data",
  RabbitRoutingKey.BATTLELOG_USER_DATA_DELETE,
  { failure: "broker-retry" },
);

export const battlelogQueues = deleteUserDataRoute.queues;

const decodePayload = Schema.decodeUnknownEffect(
  Schema.fromJsonString(BattlelogUserDataDelete),
);

export const DeleteUserDataConsumer = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const application = yield* BattlelogApplication;

    yield* rabbit.consume(
      {
        queue: deleteUserDataRoute.queue,
        prefetch: deleteUserDataRoute.prefetch,
        failurePolicy: deleteUserDataRoute.failurePolicy,
      },
      (delivery) =>
        Effect.gen(function* () {
          const payload = yield* decodePayload(
            new TextDecoder().decode(delivery.content),
          );

          yield* application.operations.internal.deleteUserData(payload);
        }),
    );
  }),
);
