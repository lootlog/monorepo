import { consumeEvent, RabbitMessaging } from "@lootlog/messaging";
import { battlelogUserDataDeleteRoute } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { BattlelogApplication } from "#src/battlelog-application";

export const UserDataDeletionConsumer = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const { operations } = yield* BattlelogApplication;

    yield* consumeEvent(rabbit, battlelogUserDataDeleteRoute, ({ userId }) =>
      operations.userData.requestDeletion(userId),
    );
  }),
);
