import { BunRedis } from "@effect/platform-bun";
import { recordHttpServerMetrics } from "@lootlog/instrumentation";
import { RabbitMessaging } from "@lootlog/messaging";
import { Context, Effect, FiberSet, Layer, Redacted, Schedule } from "effect";
import { HttpClient } from "effect/unstable/http";
import { Redis } from "effect/unstable/persistence";
import { makeGatewayAuth, type GatewayAuth } from "#src/auth/auth-service";
import { makeMargonemProofVerifier } from "#src/auth/margonem-proof";
import {
  GatewayConfig,
  type GatewayConfiguration,
} from "#src/config/gateway-config";
import { makeGuildStore } from "#src/guilds/guild-store";
import { makeGatewayHttpBoundary } from "#src/http-api/gateway-http";
import {
  makeBackgroundTaskRunner,
  type BackgroundTaskRunner,
} from "#src/platform/background-tasks";
import { RedisGatewayStore } from "#src/platform/redis-store";
import {
  gatewayQueueDefinitions,
  RabbitBridge,
} from "#src/rabbit/rabbit-bridge";
import { ActivityPublisher } from "#src/rabbit/activity-publisher";
import { CoveragePublisher } from "#src/rabbit/coverage-publisher";
import { CommandHandler } from "#src/realtime/command-handler";
import { AirTagService } from "#src/realtime/air-tag-service";
import { MapPingService } from "#src/realtime/map-ping-service";
import { PresenceStore } from "#src/realtime/presence-store";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import type { SessionData } from "#src/realtime/session";

export interface GatewayApplicationService {
  readonly config: GatewayConfiguration;
  readonly auth: GatewayAuth;
  readonly hub: RealtimeHub;
  readonly presence: PresenceStore;
  readonly commands: CommandHandler;
  readonly activity: ActivityPublisher;
  readonly runBackground: BackgroundTaskRunner;
  readonly runPromise: <A, E>(effect: Effect.Effect<A, E>) => Promise<A>;
}

export class GatewayApplication extends Context.Service<
  GatewayApplication,
  GatewayApplicationService
>()("@lootlog/gateway/Application") {
  static readonly layerWithoutDependencies = Layer.effect(
    GatewayApplication,
    Effect.gen(function* () {
      const config = yield* GatewayConfig;
      const messaging = yield* RabbitMessaging;
      const httpClient = yield* HttpClient.HttpClient;
      const backgroundFibers = yield* FiberSet.make<unknown, unknown>();
      const runBackgroundEffect =
        yield* FiberSet.runtime(backgroundFibers)<never>();
      const runPromise =
        yield* FiberSet.runtimePromise(backgroundFibers)<never>();
      const runBackground = makeBackgroundTaskRunner(runBackgroundEffect);
      const redisClient = yield* Redis.Redis;
      const redis = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: async () => {
            const store = new RedisGatewayStore(
              redisClient,
              {
                ...config.redis,
                password: Redacted.value(config.redis.password),
              },
              runPromise,
              runBackground,
            );
            await store.connect();
            return store;
          },
          catch: (cause) =>
            new Error("Failed to connect Gateway Redis", { cause }),
        }),
        (store) => Effect.tryPromise(() => store.close()),
      );
      const auth = makeGatewayAuth(config, httpClient);
      const hub = new RealtimeHub(config, redis, runBackground);
      yield* hub.start();
      const coverage = new CoveragePublisher(messaging);
      const presence = new PresenceStore(redis, hub, Date.now, coverage);
      yield* presence
        .sweepExpired()
        .pipe(
          Effect.repeat(Schedule.spaced(presence.sweepSchedule)),
          Effect.forkScoped,
        );
      const activity = new ActivityPublisher(messaging, config);
      const mapPings = new MapPingService(redis, hub);
      const airTags = new AirTagService(redis, hub);
      const commands = new CommandHandler(
        makeGuildStore(config, redis, httpClient),
        makeMargonemProofVerifier(config, httpClient),
        presence,
        hub,
        activity,
        mapPings,
        airTags,
      );
      const rabbit = new RabbitBridge(
        messaging,
        hub,
        commands,
        presence,
        coverage,
      );
      yield* Effect.acquireRelease(rabbit.start(), () =>
        rabbit.stop().pipe(Effect.orDie),
      );

      yield* Effect.logInfo("Gateway application initialized").pipe(
        Effect.annotateLogs({
          instanceId: hub.instanceId,
          serviceNamespace: config.serviceNamespace,
        }),
      );
      return GatewayApplication.of({
        config,
        auth,
        hub,
        presence,
        commands,
        activity,
        runBackground,
        runPromise,
      });
    }),
  );
}

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* GatewayConfig;
    return RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: `${config.serviceName}-${config.environment}`,
      queues: gatewayQueueDefinitions,
    });
  }),
).pipe(Layer.provide(GatewayConfig.layer));

export const GatewayApplicationLive =
  GatewayApplication.layerWithoutDependencies.pipe(
    Layer.provide(RabbitLive),
    Layer.provide(
      Layer.unwrap(
        Effect.map(GatewayConfig, (config) =>
          BunRedis.layer({
            url: `redis://${encodeURIComponent(config.redis.username)}:${encodeURIComponent(Redacted.value(config.redis.password))}@${config.redis.host}:${config.redis.port}`,
          }),
        ),
      ).pipe(Layer.provide(GatewayConfig.layer)),
    ),
    Layer.provide(GatewayConfig.layer),
  );

const hasCredentialQuery = (url: URL): boolean =>
  ["token", "ticket", "authorization", "access_token"].some((key) =>
    url.searchParams.has(key),
  );

interface UpgradeServer {
  readonly upgrade: (
    request: Request,
    options: {
      readonly data: SessionData;
      readonly headers?: HeadersInit;
    },
  ) => boolean;
}

const websocketResponseHeaders = (
  request: Request,
): HeadersInit | undefined => {
  const protocols = request.headers
    .get("sec-websocket-protocol")
    ?.split(",")
    .map((protocol) => protocol.trim());
  return protocols?.includes("lootlog.realtime.v1")
    ? { "sec-websocket-protocol": "lootlog.realtime.v1" }
    : undefined;
};

let defaultGatewayHttpBoundary:
  | ReturnType<typeof makeGatewayHttpBoundary>
  | undefined;

const handleGatewayHttpRequest = (request: Request): Promise<Response> => {
  defaultGatewayHttpBoundary ??= makeGatewayHttpBoundary();
  return defaultGatewayHttpBoundary.handler(request);
};

export const createGatewayFetch =
  (
    application: GatewayApplicationService,
    httpHandler = handleGatewayHttpRequest,
  ) =>
  async (
    request: Request,
    activeServer: UpgradeServer,
  ): Promise<Response | undefined> => {
    const url = new URL(request.url);
    const complete = async (
      response: Response | undefined,
      route?: string,
    ): Promise<Response | undefined> => {
      await application.runPromise(
        recordHttpServerMetrics({
          method: request.method,
          route,
          status: response?.status ?? 101,
          durationMilliseconds: performance.now() - startedAt,
        }),
      );
      return response;
    };
    const startedAt = performance.now();
    if (url.pathname === "/healthz") {
      return complete(await httpHandler(request), "/healthz");
    }
    if (url.pathname !== application.config.websocketPath) {
      return complete(new Response("Not found", { status: 404 }));
    }
    if (hasCredentialQuery(url)) {
      return complete(
        new Response("Credentials are not accepted in the URL", {
          status: 400,
        }),
        application.config.websocketPath,
      );
    }
    const origin = request.headers.get("origin");
    if (!application.auth.isAllowedOrigin(origin)) {
      return complete(
        new Response("Origin not allowed", { status: 403 }),
        application.config.websocketPath,
      );
    }
    const credential = application.auth.readCredential(request);
    if (!credential)
      return complete(
        new Response("Unauthorized", { status: 401 }),
        application.config.websocketPath,
      );
    const identity = await application.runPromise(
      application.auth.verify(credential),
    );
    if (!identity)
      return complete(
        new Response("Unauthorized", { status: 401 }),
        application.config.websocketPath,
      );

    const connectionId = crypto.randomUUID();
    const upgraded = activeServer.upgrade(request, {
      data: {
        ...identity,
        connectionId,
        platform: application.auth.getPlatform(origin ?? ""),
        userAgent: request.headers.get("user-agent") ?? undefined,
        joined: false,
        guilds: [],
        subscriptions: new Map(),
        airTagScopes: [],
        confidence: "reported",
        backpressureStrikes: 0,
      },
      headers: websocketResponseHeaders(request),
    });
    return complete(
      upgraded
        ? undefined
        : new Response("WebSocket upgrade failed", { status: 400 }),
      application.config.websocketPath,
    );
  };

export const GatewayServer = Layer.effectDiscard(
  Effect.gen(function* () {
    const application = yield* GatewayApplication;
    const httpBoundary = yield* Effect.acquireRelease(
      Effect.sync(makeGatewayHttpBoundary),
      (boundary) => Effect.tryPromise(boundary.dispose),
    );
    const fetch = createGatewayFetch(application, httpBoundary.handler);
    const server = yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve<SessionData>({
          hostname: "0.0.0.0",
          port: application.config.port,
          fetch,
          websocket: {
            perMessageDeflate: false,
            maxPayloadLength: 256 * 1_024,
            idleTimeout: 70,
            open(socket) {
              application.hub.register(socket);
            },
            message(socket, message) {
              application.runBackground(
                "websocket.message",
                application.commands.handle(socket, message),
              );
            },
            close(socket) {
              application.hub.unregister(socket);
              application.runBackground(
                "websocket.disconnect-activity",
                application.activity.publish("DISCONNECT_EVENT", socket.data),
              );
              application.runBackground(
                "websocket.disconnect-presence",
                application.presence.disconnect(socket.data),
              );
            },
          },
        }),
      ),
      (activeServer) => Effect.tryPromise(() => activeServer.stop(true)),
    );
    yield* Effect.logInfo("Gateway WebSocket server listening").pipe(
      Effect.annotateLogs({
        hostname: server.hostname,
        port: server.port,
        websocketPath: application.config.websocketPath,
      }),
    );
  }),
).pipe(Layer.provide(GatewayApplicationLive));
