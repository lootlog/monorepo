import {
  RabbitMessaging,
  type RabbitMessagingService,
} from "@lootlog/messaging";
import { ApiOperatorRpcGroup, ApiRpcGroup } from "@lootlog/rpc/api";
import { AuthRpcGroup } from "@lootlog/rpc/auth";
import { makeRpcClient, type ServiceRpcClient } from "@lootlog/rpc/client";
import {
  type RpcUnauthorizedError,
  RpcUnavailableError,
} from "@lootlog/rpc/errors";
import { serviceRpcRoutes } from "@lootlog/rpc/server";
import { TEST_RPC_TOKEN, testRpcUpstream } from "@lootlog/rpc/testing";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { Capability } from "@lootlog/schema/permissions";
import { BunRedis, BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer, ManagedRuntime, type Redacted } from "effect";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import { Redis } from "effect/persistence";
import { fingerprintAccessToken } from "#src/auth/auth.service";
import { makeRedisService, type RedisService } from "#src/redis/redis.service";
import { getRejectedAuthTokenKey } from "#src/shared/cache";
import {
  ApiRpcRouter,
  LootlogApiRouter,
} from "../src/runtime/application/http-routes.js";
import { ApiRedis } from "../src/runtime/infrastructure/api-redis.js";
import { ApiRuntimeConfig } from "../src/runtime/infrastructure/api-runtime-config.js";
import { count, isNull, sql } from "drizzle-orm";
import {
  ApiDatabase,
  ApiDatabaseLive,
  type ApiDatabaseValue,
} from "../src/database/drizzle/database.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "../src/database/drizzle/organization.schema.js";
import { timerTable } from "../src/database/drizzle/timer.schema.js";

export const caller = {
  userId: "user-1",
  discordId: "discord-1",
} as const;

export const authorizedGuildId = "guild-authorized";

export const forbiddenGuildId = "guild-forbidden";

export const world = "aldous";

export const headers = {
  authorization: "Bearer validated-by-forward-auth",
  "content-type": "application/json",
  "x-auth-user-id": caller.userId,
  "x-auth-discord-id": caller.discordId,
};

type IdpTokenAnswer = Effect.Effect<
  {
    readonly accessToken: string;
    readonly expiresIn: number;
    readonly scopes: ReadonlyArray<string>;
  },
  RpcUnauthorizedError | RpcUnavailableError
>;

export const makeHttpBoundaryFixture = () => {
  const publishedMessages: Parameters<RabbitMessagingService["publish"]>[0][] =
    [];

  const rabbitBoundary: RabbitMessagingService = {
    publish: (message) =>
      Effect.sync(() => {
        publishedMessages.push(message);
      }),
    consume: () => Effect.never,
    ack: () => Effect.void,
    nack: () => Effect.void,
  };

  let authServiceAnswer: (() => IdpTokenAnswer) | null = null;

  const authRpcBoundary = HttpRouter.toWebHandler(
    Layer.mergeAll(
      serviceRpcRoutes({
        group: AuthRpcGroup,
        handlers: AuthRpcGroup.toLayer({
          getIdpToken: () =>
            authServiceAnswer
              ? authServiceAnswer()
              : Effect.fail(new RpcUnavailableError()),
          listPlatformRoleHolders: () => Effect.succeed({ userIds: [] }),
          getApiKeyStatuses: () => Effect.succeed({ keys: [] }),
        }),
        callerTokens: { api: TEST_RPC_TOKEN },
        spanPrefix: "test.auth-rpc",
      }),
      HttpServer.layerServices,
    ),
    { disableLogger: true },
  );

  const fetchBoundary: typeof globalThis.fetch = Object.assign(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);

      return new URL(request.url).host === "auth.test"
        ? authRpcBoundary.handler(request)
        : globalThis.fetch(request);
    },
    { preconnect: globalThis.fetch.preconnect },
  );

  const RuntimeBoundaries = Layer.mergeAll(
    ApiRuntimeConfig.layer,
    ApiRedis.layer.pipe(Layer.provide(ApiRuntimeConfig.layer)),
    Layer.succeed(RabbitMessaging, RabbitMessaging.of(rabbitBoundary)),
    FetchHttpClient.layer.pipe(
      Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetchBoundary)),
    ),
  );

  const issueRevokedDiscordToken = async (
    redis: RedisService,
    identity: { readonly userId: string; readonly discordId: string },
  ) => {
    authServiceAnswer = () =>
      Effect.succeed({
        accessToken: "revoked-token",
        expiresIn: 3_600,
        scopes: DISCORD_AUTH_SCOPES,
      });
    await Effect.runPromise(
      redis.set(
        getRejectedAuthTokenKey(
          identity.userId,
          identity.discordId,
          fingerprintAccessToken("revoked-token"),
        ),
        "1",
        60,
      ),
    );
  };

  const boundary = HttpRouter.toWebHandler(
    LootlogApiRouter.pipe(
      Layer.provide(RuntimeBoundaries),
      Layer.provide(BunHttpServer.layerHttpServices),
    ),
    { disableLogger: true },
  );

  const rpcBoundary = HttpRouter.toWebHandler(
    ApiRpcRouter.pipe(
      Layer.provide(RuntimeBoundaries),
      Layer.provide(BunHttpServer.layerHttpServices),
    ),
    { disableLogger: true },
  );

  const requestRpcPort = (path: string) =>
    rpcBoundary.handler(new Request(`http://api.test${path}`, { headers }));

  const rpcPortClient = FetchHttpClient.layer.pipe(
    Layer.provide(
      Layer.succeed(
        FetchHttpClient.Fetch,
        Object.assign(
          (input: RequestInfo | URL, init?: RequestInit) =>
            rpcBoundary.handler(new Request(input, init)),
          { preconnect: globalThis.fetch.preconnect },
        ),
      ),
    ),
  );

  const callRpc = <A, E>(
    token: Redacted.Redacted<string>,
    use: (client: ServiceRpcClient<typeof ApiRpcGroup>) => Effect.Effect<A, E>,
  ) =>
    Effect.runPromise(
      makeRpcClient(ApiRpcGroup, {
        ...testRpcUpstream,
        token,
        spanPrefix: "test.api-rpc",
      }).pipe(
        Effect.flatMap(use),
        Effect.scoped,
        Effect.provide(rpcPortClient),
      ),
    );

  const callOperatorRpc = <A, E>(
    token: Redacted.Redacted<string>,
    use: (
      client: ServiceRpcClient<typeof ApiOperatorRpcGroup>,
    ) => Effect.Effect<A, E>,
  ) =>
    Effect.runPromise(
      makeRpcClient(ApiOperatorRpcGroup, {
        ...testRpcUpstream,
        token,
        spanPrefix: "test.api-rpc",
      }).pipe(
        Effect.flatMap(use),
        Effect.scoped,
        Effect.provide(rpcPortClient),
      ),
    );

  const answerAuthService = (answer: () => IdpTokenAnswer) => {
    authServiceAnswer = answer;
  };

  const request = (path: string, init?: RequestInit) =>
    boundary.handler(
      new Request(`http://api.test${path}`, {
        ...init,
        headers: { ...headers, ...init?.headers },
      }),
    );

  const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);
  let database: ApiDatabaseValue;

  const countTimers = async () =>
    (
      await databaseRuntime.runPromise(
        database
          .select({ value: count() })
          .from(timerTable)
          .where(isNull(timerTable.deletedAt)),
      )
    )[0]?.value;

  let redis: RedisService;
  let redisRuntime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;

  const connect = async () => {
    database = await databaseRuntime.runPromise(ApiDatabase);
    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
    redisRuntime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );
    redis = makeRedisService(await redisRuntime.runPromise(Redis.Redis));

    return { database, redis };
  };

  const reset = async () => {
    publishedMessages.length = 0;
    authServiceAnswer = null;
    await redisRuntime.runPromise(
      Effect.flatMap(Redis.Redis, (client) => client.send("FLUSHALL")),
    );
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* database.execute(
          sql`TRUNCATE TABLE "Guild" RESTART IDENTITY CASCADE`,
        );
        const updatedAt = new Date();
        yield* database.insert(guildTable).values([
          {
            id: authorizedGuildId,
            name: "Authorized Organization",
            ownerId: "different-owner",
            updatedAt,
          },
          {
            id: forbiddenGuildId,
            name: "Forbidden Organization",
            ownerId: "different-owner",
            updatedAt,
          },
        ]);
        yield* database.insert(roleTable).values({
          id: "timer-maintainer",
          guildId: authorizedGuildId,
          name: "Timer maintainer",
          updatedAt,
          permissions: [
            Capability.ADMIN,
            Capability.LOOTLOG_EVENTS_READ,
            Capability.LOOTLOG_TIMERS_READ,
            Capability.LOOTLOG_TIMERS_WRITE,
            Capability.LOOTLOG_MANAGE,
          ],
        });

        const members = yield* database
          .insert(memberTable)
          .values([
            {
              userId: caller.discordId,
              globalUserId: caller.userId,
              guildId: authorizedGuildId,
              name: "Authorized member",
              lastDiscordSyncAt: updatedAt,
              updatedAt,
            },
            {
              userId: caller.discordId,
              globalUserId: caller.userId,
              guildId: forbiddenGuildId,
              name: "Member without timer permissions",
              lastDiscordSyncAt: updatedAt,
              updatedAt,
            },
          ])
          .returning();

        const authorizedMember = members.find(
          (member) => member.guildId === authorizedGuildId,
        );

        if (!authorizedMember)
          throw new Error("Authorized member was not created");
        yield* database
          .insert(memberToRoleTable)
          .values({ A: authorizedMember.id, B: "timer-maintainer" });
      }),
    );
  };

  const close = async () => {
    await redisRuntime.dispose();
    await databaseRuntime.dispose();
    await boundary.dispose();
    await rpcBoundary.dispose();
    await authRpcBoundary.dispose();
  };

  return {
    publishedMessages,
    answerAuthService,
    callRpc,
    callOperatorRpc,
    requestRpcPort,
    issueRevokedDiscordToken,
    boundary,
    request,
    databaseRuntime,
    countTimers,
    connect,
    reset,
    close,
  };
};
