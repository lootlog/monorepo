import { RabbitMessaging } from "@lootlog/messaging";
import { Context, Effect, Layer } from "effect";
import { AuthService } from "#src/auth/auth-service";
import { MargonemProofVerifier } from "#src/auth/margonem-proof";
import {
  GatewayConfig,
  type GatewayConfiguration,
} from "#src/config/gateway-config";
import { GuildStore } from "#src/guilds/guild-store";
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
  readonly auth: AuthService;
  readonly hub: RealtimeHub;
  readonly presence: PresenceStore;
  readonly commands: CommandHandler;
  readonly activity: ActivityPublisher;
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
      const redis = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: async () => {
            const store = new RedisGatewayStore(config.redis);
            await store.connect();
            return store;
          },
          catch: (cause) =>
            new Error("Failed to connect Gateway Redis", { cause }),
        }),
        (store) => Effect.promise(() => store.close()),
      );
      const auth = new AuthService(config);
      const hub = new RealtimeHub(config, redis);
      yield* Effect.promise(() => hub.start());
      const coverage = new CoveragePublisher(messaging);
      const presence = new PresenceStore(redis, hub, Date.now, coverage);
      yield* Effect.acquireRelease(
        Effect.sync(() => presence.start()),
        () => Effect.sync(() => presence.stop()),
      );
      const activity = new ActivityPublisher(messaging, config);
      const mapPings = new MapPingService(redis, hub);
      const airTags = new AirTagService(redis, hub);
      const commands = new CommandHandler(
        config,
        new GuildStore(config, redis),
        new MargonemProofVerifier(config),
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
      });
    }),
  );
}

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* GatewayConfig;
    return RabbitMessaging.layer({
      uri: config.rabbitmqUri,
      connectionName: `${config.serviceName}-${config.environment}`,
      queues: gatewayQueueDefinitions,
    });
  }),
).pipe(Layer.provide(GatewayConfig.layer));

export const GatewayApplicationLive =
  GatewayApplication.layerWithoutDependencies.pipe(
    Layer.provide(RabbitLive),
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

export const createGatewayFetch =
  (application: GatewayApplicationService) =>
  async (
    request: Request,
    activeServer: UpgradeServer,
  ): Promise<Response | undefined> => {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return Response.json({ status: "ok" });
    }
    if (url.pathname !== application.config.websocketPath) {
      return new Response("Not found", { status: 404 });
    }
    if (hasCredentialQuery(url)) {
      return new Response("Credentials are not accepted in the URL", {
        status: 400,
      });
    }
    const origin = request.headers.get("origin");
    if (!application.auth.isAllowedOrigin(origin)) {
      return new Response("Origin not allowed", { status: 403 });
    }
    const credential = application.auth.readCredential(request);
    if (!credential) return new Response("Unauthorized", { status: 401 });
    const identity = await application.auth.verify(credential);
    if (!identity) return new Response("Unauthorized", { status: 401 });

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
    return upgraded
      ? undefined
      : new Response("WebSocket upgrade failed", { status: 400 });
  };

export const GatewayServer = Layer.effectDiscard(
  Effect.gen(function* () {
    const application = yield* GatewayApplication;
    const fetch = createGatewayFetch(application);
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
              void application.commands.handle(socket, message);
            },
            close(socket) {
              application.hub.unregister(socket);
              void application.activity.publish(
                "DISCONNECT_EVENT",
                socket.data,
              );
              void application.presence.disconnect(socket.data);
            },
          },
        }),
      ),
      (activeServer) => Effect.promise(() => activeServer.stop(true)),
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
