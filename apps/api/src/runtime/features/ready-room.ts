import { makeJsonCodec } from "#src/redis/redis.service";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { makeChatOperations } from "#src/http-api/handlers/chat/chat.data-layer";
import { makeReadyRoomDataLayer } from "#src/http-api/handlers/party-ready-room/ready-room.data-layer";
import type { ReadyRoomRedis } from "#src/http-api/handlers/party-ready-room/ready-room.repository";
import { makeReadyRoomPublicationOutbox } from "#src/messaging/ready-room/ready-room-publication-outbox";
import type { PartyGatheringUpdateEnvelope } from "@lootlog/schema/party-ready-room";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { makeChatEvents, makeChatRedis } from "#src/runtime/features/chat";

export const makeReadyRoomRedis = (
  redis: ApiRedis["Service"],
): ReadyRoomRedis => {
  const attempt = <A>(operation: () => PromiseLike<A>) =>
    Effect.tryPromise({ try: operation, catch: (error) => error });

  return {
    getJson: (key, schema) =>
      attempt(() => redis.getJson(key, makeJsonCodec(schema))),
    eval: (script, keys, arguments_) =>
      attempt(() => redis.eval(script, [...keys], [...arguments_])),
  };
};

export const makeGatheringUpdatePublisher =
  (rabbit: Pick<RabbitMessaging["Service"], "publish">) =>
  (envelope: PartyGatheringUpdateEnvelope) =>
    rabbit
      .publish({
        exchange: "default",
        routingKey: RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED,
        messageId: `party-gathering:${envelope.notificationId}:${envelope.revision}:${envelope.guildId}:${envelope.update.type}`,
        content: new TextEncoder().encode(JSON.stringify(envelope)),
      })
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

    const chat = yield* makeChatOperations(
      makeChatRedis(redis),
      makeChatEvents(rabbit),
    );

    return makeReadyRoomDataLayer(makeReadyRoomRedis(redis), {
      publishGatheringUpdate: makeGatheringUpdatePublisher(rabbit),
      publish: (envelope) =>
        rabbit
          .publish({
            exchange: "default",
            routingKey: RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
            content: new TextEncoder().encode(JSON.stringify(envelope)),
          })
          .pipe(Effect.asVoid),
      publishGathering: (payload) =>
        rabbit
          .publish({
            exchange: "default",
            routingKey: RabbitRoutingKey.GUILDS_PARTY_GATHERING,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          })
          .pipe(Effect.asVoid),
      publishCancellation: (payload) =>
        rabbit
          .publish({
            exchange: "default",
            routingKey: RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          })
          .pipe(Effect.asVoid),
      endPartyGatheringMessages: chat.endPartyGatheringMessages,
    });
  }),
);
