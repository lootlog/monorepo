import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { makeMessagingDataLayer } from "#src/messaging/messaging.data-layer";
import {
  createReadyRoomForNotification,
  type ReadyRoomEffects,
} from "#src/messaging/ready-room/ready-room.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import {
  makeReadyRoomRedis,
  makeGatheringUpdatePublisher,
} from "#src/runtime/features/ready-room";

export const messagingData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const readyRedis = makeReadyRoomRedis(redis);

    const publishReadyRoom: ReadyRoomEffects["publish"] = (envelope) =>
      rabbit
        .publish(
          eventMessage(
            RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
            envelope,
          ),
        )
        .pipe(Effect.asVoid);

    return makeMessagingDataLayer(
      redis,
      {
        publish: (routingKey, payload) =>
          rabbit.publish(eventMessage(routingKey, payload)).pipe(Effect.asVoid),
      },
      {
        create: (input) =>
          createReadyRoomForNotification(
            readyRedis,
            {
              publish: publishReadyRoom,
              publishGatheringUpdate: makeGatheringUpdatePublisher(rabbit),
            },
            input,
          ),
      },
    );
  }),
);
