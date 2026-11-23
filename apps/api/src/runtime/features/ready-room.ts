import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import type { RedisService } from "#src/redis/redis.service";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { makeChatOperations } from "#src/chat/chat.data-layer";
import { makeReadyRoomDataLayer } from "#src/messaging/ready-room/ready-room.data-layer";
import type { ReadyRoomRedis } from "#src/messaging/ready-room/ready-room.repository";
import { makeReadyRoomPublicationOutbox } from "#src/messaging/ready-room/ready-room-publication-outbox";
import type { PartyGatheringUpdateEnvelope } from "@lootlog/schema/party-ready-room";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { makeChatEvents, makeChatRedis } from "#src/runtime/features/chat";

export const makeReadyRoomRedis = (redis: RedisService): ReadyRoomRedis => ({
  getJson: (key, schema) => redis.getJson(key, makeJsonCodec(schema)),
  eval: redis.eval,
});

export const makeGatheringUpdatePublisher =
  (rabbit: Pick<RabbitMessaging["Service"], "publish">) =>
  (envelope: PartyGatheringUpdateEnvelope) =>
    rabbit
      .publish(
        eventMessage(
          RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED,
          envelope,
          {
            messageId: `party-gathering:${envelope.notificationId}:${envelope.revision}:${envelope.guildId}:${envelope.update.type}`,
          },
        ),
      )
      .pipe(Effect.asVoid);

export const readyRoomPublications = Layer.effectDiscard(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    yield* makeReadyRoomPublicationOutbox(
      makeReadyRoomRedis(redis),
      makeGatheringUpdatePublisher(rabbit),
    ).run.pipe(Effect.forkScoped);
  }),
);

export const readyRoomData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;

    const chat = makeChatOperations(
      makeChatRedis(redis),
      makeChatEvents(rabbit),
    );

    return makeReadyRoomDataLayer(makeReadyRoomRedis(redis), {
      publishGatheringUpdate: makeGatheringUpdatePublisher(rabbit),
      publish: (envelope) =>
        rabbit
          .publish(
            eventMessage(
              RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
              envelope,
            ),
          )
          .pipe(Effect.asVoid),
      publishGathering: (payload) =>
        rabbit
          .publish(
            eventMessage(RabbitRoutingKey.GUILDS_PARTY_GATHERING, payload),
          )
          .pipe(Effect.asVoid),
      publishCancellation: (payload) =>
        rabbit
          .publish(
            eventMessage(
              RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
              payload,
            ),
          )
          .pipe(Effect.asVoid),
      endPartyGatheringMessages: chat.endPartyGatheringMessages,
    });
  }),
);
