import { makeMapsOperation } from "#src/maps/maps.operation";
import { PublicGuildStatsCardRepository } from "#src/public-guild-stats-card/public-guild-stats-card.repository";
import {
  makePublicGuildStatsCard,
  PublicGuildStatsCardAdapterError,
  PublicGuildStatsCardImageAdapter,
} from "#src/public-guild-stats-card/public-guild-stats-card.service";
import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import { makeJsonCodec } from "#src/redis/redis.service";
import { applicationLogger } from "#src/shared/logging/application-logger";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { HttpClient } from "effect/unstable/http";
import {
  makeChatDataLayer,
  makeChatOperations,
  type ChatEvents,
  type ChatRedis,
} from "../handlers/chat/chat.data-layer.js";
import {
  InternalGuildsData,
  InternalGuildsOperationError,
  type InternalGuildsCache,
} from "../handlers/internal/internal.handlers.js";
import { makeMessagingDataLayer } from "../handlers/messaging/messaging.data-layer.js";
import {
  createReadyRoomForNotification,
  makeReadyRoomDataLayer,
} from "../handlers/party-ready-room/ready-room.data-layer.js";
import {
  PublicSystemData,
  PublicSystemOperationError,
} from "../handlers/public-system/public-system.handlers.js";
import { makeReservationCatalogAdapter } from "../handlers/reservations-roles/reservation-catalog.adapter.js";
import { makeReservationReadDataLayer } from "../handlers/reservations-roles/reservation-read.data-layer.js";
import { makeReservationSharingDataLayer } from "../handlers/reservations-roles/reservation-sharing.data-layer.js";
import {
  ReservationsRolesOperationError,
  RolesData,
} from "../handlers/reservations-roles/reservations-roles.handlers.js";
import {
  UserLootlogConfigData,
  UserLootlogConfigOperationError,
  type UserLootlogConfigCache,
} from "../handlers/user-lootlog-config/user-lootlog-config.handlers.js";
import {
  GuildConfigurationData,
  UsersGuildsOperationError,
} from "../handlers/users-guilds/users-guilds.handlers.js";
import { ApiRedis } from "./api-redis.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";

export const NativePublicSystemData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const repository = yield* PublicGuildStatsCardRepository;
    const cacheOperation = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new PublicGuildStatsCardAdapterError({ cause }),
      });
    return PublicSystemData.layerServices({
      getMaps: makeMapsOperation({
        httpClient,
        redis,
        url: config.mapsApiUrl,
      }).pipe(
        Effect.mapError((cause) => new PublicSystemOperationError({ cause })),
      ),
      statsCard: makePublicGuildStatsCard({
        repository,
        environment: config.environment,
        image: new PublicGuildStatsCardImageAdapter(httpClient),
        cache: {
          get: (key) => cacheOperation(() => redis.get(key)),
          set: (key, value, ttl) =>
            cacheOperation(() => redis.set(key, value, ttl)),
          setNX: (key, value, ttl) =>
            cacheOperation(() => redis.setNX(key, value, ttl)),
          del: (key) =>
            cacheOperation(() => redis.del(key)).pipe(Effect.asVoid),
        },
      }),
      local: config.environment === "local",
    });
  }),
).pipe(Layer.provide(PublicGuildStatsCardRepository.layerDatabase));

export const NativeInternalGuildsData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const cacheOperation = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new InternalGuildsOperationError({ cause }),
      });
    const cache: InternalGuildsCache = {
      get: (key) => cacheOperation(() => redis.get(key)),
      getJson: (key, schema) =>
        cacheOperation(() => redis.getJson(key, makeJsonCodec(schema))),
      set: (key, value, ttl) =>
        cacheOperation(() => redis.set(key, value, ttl)),
      setJson: (key, value, ttl) =>
        cacheOperation(() => redis.setJson(key, value, ttl)),
      del: (key) => cacheOperation(() => redis.del(key)).pipe(Effect.asVoid),
    };
    return InternalGuildsData.layerDatabase(cache);
  }),
);

export const nativeLogger = applicationLogger;

export const makeAmqpAdapter = (rabbit: RabbitMessaging["Service"]) =>
  ({
    publish: (exchange: string, routingKey: string, payload: unknown) =>
      rabbit.publish({
        exchange: exchange as "default",
        routingKey: routingKey as Parameters<
          typeof rabbit.publish
        >[0]["routingKey"],
        content: new TextEncoder().encode(JSON.stringify(payload)),
      }),
  }) satisfies AmqpPublisher;

export const NativeMessagingData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const readyRedis = {
      getJson: (key, schema) =>
        attempt(() => redis.getJson(key, makeJsonCodec(schema))),
      eval: <A>(
        script: string,
        keys: ReadonlyArray<string>,
        arguments_: ReadonlyArray<string | number>,
      ) => attempt(() => redis.eval<A>(script, [...keys], [...arguments_])),
    };
    const publishReadyRoom = (envelope: unknown) =>
      rabbit
        .publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
          content: new TextEncoder().encode(JSON.stringify(envelope)),
        })
        .pipe(Effect.asVoid);
    return makeMessagingDataLayer(
      {
        get: (key) => attempt(() => redis.get(key)),
        set: (key, value, ttl) => attempt(() => redis.set(key, value, ttl)),
        eval: <A>(
          script: string,
          keys: ReadonlyArray<string>,
          arguments_: ReadonlyArray<string | number>,
        ) => attempt(() => redis.eval<A>(script, [...keys], [...arguments_])),
      },
      {
        publish: (routingKey, payload) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey,
              content: new TextEncoder().encode(JSON.stringify(payload)),
            })
            .pipe(Effect.asVoid),
      },
      {
        create: (input) =>
          createReadyRoomForNotification(
            readyRedis,
            { publish: publishReadyRoom },
            input,
          ),
      },
    );
  }),
);

export const NativeReadyRoomData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const redisAdapter: ChatRedis = {
      rpush: (key, value) => attempt(() => redis.rpush(key, value)),
      ltrim: (key, start, stop) => attempt(() => redis.ltrim(key, start, stop)),
      lrange: (key, start, stop) =>
        attempt(() => redis.lrange(key, start, stop)),
      lset: (key, index, value) => attempt(() => redis.lset(key, index, value)),
      lrem: (key, count, value) => attempt(() => redis.lrem(key, count, value)),
      del: (key) => attempt(() => redis.del(key)),
    };
    const chatEvents: ChatEvents = {
      publish: (routingKey, payload) =>
        rabbit
          .publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          })
          .pipe(Effect.asVoid),
    };
    const chat = yield* makeChatOperations(redisAdapter, chatEvents);
    return makeReadyRoomDataLayer(
      {
        getJson: (key, schema) =>
          attempt(() => redis.getJson(key, makeJsonCodec(schema))),
        eval: <A>(
          script: string,
          keys: ReadonlyArray<string>,
          arguments_: ReadonlyArray<string | number>,
        ) => attempt(() => redis.eval<A>(script, [...keys], [...arguments_])),
      },
      {
        publish: (envelope) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey: RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
              content: new TextEncoder().encode(JSON.stringify(envelope)),
            })
            .pipe(Effect.asVoid),
        endPartyGatheringMessages: chat.endPartyGatheringMessages,
      },
    );
  }),
);

export const NativeChatData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    return makeChatDataLayer(
      {
        rpush: (key, value) => attempt(() => redis.rpush(key, value)),
        ltrim: (key, start, stop) =>
          attempt(() => redis.ltrim(key, start, stop)),
        lrange: (key, start, stop) =>
          attempt(() => redis.lrange(key, start, stop)),
        lset: (key, index, value) =>
          attempt(() => redis.lset(key, index, value)),
        lrem: (key, count, value) =>
          attempt(() => redis.lrem(key, count, value)),
        del: (key) => attempt(() => redis.del(key)),
      },
      {
        publish: (routingKey, payload) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey,
              content: new TextEncoder().encode(JSON.stringify(payload)),
            })
            .pipe(Effect.asVoid),
      },
    );
  }),
);

export const NativeUserLootlogConfigData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new UserLootlogConfigOperationError({ cause }),
      });
    const cache: UserLootlogConfigCache = {
      getJson: (key, schema) =>
        attempt(() => redis.getJson(key, makeJsonCodec(schema))),
      setJson: (key, value, ttl) =>
        attempt(() => redis.setJson(key, value, ttl)),
      deleteByPattern: (pattern) =>
        attempt(() => redis.deleteByPattern(pattern)).pipe(Effect.asVoid),
    };
    return UserLootlogConfigData.layerDatabase(cache);
  }),
);

export const NativeRolesData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    RolesData.layerDatabase({
      deleteByPattern: (pattern) =>
        Effect.tryPromise({
          try: () => redis.deleteByPattern(pattern),
          catch: (cause) => new ReservationsRolesOperationError({ cause }),
        }).pipe(Effect.asVoid),
    }),
  ),
);

export const NativeGuildConfigurationData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    GuildConfigurationData.layerDatabase({
      get: (key) =>
        Effect.tryPromise({
          try: () => redis.get(key),
          catch: (cause) => new UsersGuildsOperationError({ cause }),
        }),
      set: (key, value, ttl) =>
        Effect.tryPromise({
          try: () => redis.set(key, value, ttl),
          catch: (cause) => new UsersGuildsOperationError({ cause }),
        }),
      del: (key) =>
        Effect.tryPromise({
          try: () => redis.del(key),
          catch: (cause) => new UsersGuildsOperationError({ cause }),
        }).pipe(Effect.asVoid),
    }),
  ),
);

export const NativeReservationSharingData = Layer.unwrap(
  Effect.map(RabbitMessaging, (rabbit) =>
    makeReservationSharingDataLayer({
      sharingChanged: (sourceGuildId, audienceGuildIds) =>
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
          content: new TextEncoder().encode(
            JSON.stringify({
              version: 2,
              action: "sharing-changed",
              sourceGuildId,
              audienceGuildIds,
              reservationId: null,
              spotId: null,
            }),
          ),
        }),
    }),
  ),
);

export const NativeReservationReadData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    return makeReservationReadDataLayer(
      makeReservationCatalogAdapter({
        cache: {
          getJson: (key, schema) =>
            attempt(() => redis.getJson(key, makeJsonCodec(schema))),
          setJson: (key, value, ttl) =>
            attempt(() => redis.setJson(key, value, ttl)),
        },
        httpClient,
        url: config.reservationsCardsUrl.toString(),
      }),
    );
  }),
);
