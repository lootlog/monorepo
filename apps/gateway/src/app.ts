import {
  GatewayMetrics,
  GatewayRuntimeMetrics,
} from "#src/realtime/gateway-metrics";
import { GatewayConnectionMetrics } from "#src/realtime/connection-metrics";
import { OnlineHistories } from "#src/realtime/online-history";
import { BunRedis } from "@effect/platform-bun";
import { recordHttpServerMetrics } from "@lootlog/instrumentation";
import { RabbitMessaging } from "@lootlog/messaging";
import {
  REALTIME_JSON_SUBPROTOCOL,
  REALTIME_SERVER_CLOSE_CODES,
} from "@lootlog/protocol/realtime";
import { Context, Duration, Effect, Layer, Option, Redacted } from "effect";
import { Headers, HttpTraceContext } from "effect/http";
import { Auth, type GatewayAuth } from "#src/auth/auth-service";
import { ApiKeyLeases } from "#src/auth/api-key-leases";
import { ProofVerifier } from "#src/auth/margonem-proof";
import {
  GatewayConfig,
  type GatewayConfiguration,
} from "#src/config/gateway-config";
import { Guilds, type GuildStore } from "#src/guilds/guild-store";
import {
  isOrganizationPresencePath,
  makeGatewayHttpBoundary,
  ORGANIZATION_PRESENCE_ROUTE,
  type GatewayHttpDependencies,
} from "#src/http-api/gateway-http";
import {
  Background,
  type BackgroundTaskRunner,
} from "#src/platform/background-tasks";
import { GatewayRedis } from "#src/platform/redis-store";
import {
  gatewayQueueDefinitions,
  RabbitBridge,
} from "#src/rabbit/rabbit-bridge";
import {
  Activity,
  type ActivityPublisher,
} from "#src/rabbit/activity-publisher";
import { Coverage } from "#src/rabbit/coverage-publisher";
import { Commands, type CommandHandler } from "#src/realtime/command-handler";
import { Ingress, type CommandIngress } from "#src/realtime/command-ingress";
import { CommandAdmissions } from "#src/realtime/command-admission";
import { AirTags } from "#src/realtime/air-tag-service";
import { MapPings } from "#src/realtime/map-ping-service";
import { BattlePings } from "#src/realtime/battle-ping-service";
import { LootSplits } from "#src/realtime/loot-split-service";
import { NpcPresence } from "#src/realtime/npc-presence-service";
import { Presence, type PresenceStore } from "#src/realtime/presence-store";
import {
  closeGradually,
  Hub,
  type RealtimeHub,
} from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";

export interface GatewayApplicationService {
  readonly config: GatewayConfiguration;
  readonly auth: GatewayAuth;
  readonly hub: RealtimeHub;
  readonly presence: PresenceStore;
  readonly guilds: GuildStore;
  readonly commands: CommandHandler;
  readonly ingress: CommandIngress;
  readonly activity: ActivityPublisher;
  readonly runBackground: BackgroundTaskRunner;
  readonly runPromise: <A, E>(effect: Effect.Effect<A, E>) => Promise<A>;
}

const PlatformLive = GatewayRedis.layer.pipe(
  Layer.provideMerge(Background.layer),
);

const DependenciesLive = Layer.mergeAll(
  Auth.layer,
  ProofVerifier.layer,
  Coverage.layer,
  Activity.layer,
  OnlineHistories.layer,
  Guilds.layer,
  CommandAdmissions.layer,
).pipe(Layer.provideMerge(Hub.layer), Layer.provideMerge(PlatformLive));

const FeaturesLive = Layer.mergeAll(
  Presence.layer,
  MapPings.layer,
  BattlePings.layer,
  LootSplits.layer,
  AirTags.layer,
  NpcPresence.layer,
).pipe(Layer.provideMerge(DependenciesLive));

const RealtimeLive = Ingress.layer.pipe(
  Layer.provideMerge(Commands.layer),
  Layer.provideMerge(FeaturesLive),
);

// Background work that only runs for as long as the replica does.
const ReplicaTasksLive = Layer.mergeAll(
  GatewayMetrics.layer,
  GatewayRuntimeMetrics.layer,
  ApiKeyLeases.layer,
  RabbitBridge.layer,
).pipe(Layer.provideMerge(RealtimeLive));

class GatewayApplication extends Context.Service<
  GatewayApplication,
  GatewayApplicationService
>()("@lootlog/gateway/Application") {
  static readonly layerWithoutDependencies = Layer.effect(
    GatewayApplication,
    Effect.gen(function* () {
      const config = yield* GatewayConfig;
      const hub = yield* Hub;
      const background = yield* Background;

      yield* Effect.logInfo("Gateway application initialized").pipe(
        Effect.annotateLogs({
          instanceId: hub.instanceId,
          serviceNamespace: config.serviceNamespace,
        }),
      );

      return GatewayApplication.of({
        config,
        auth: yield* Auth,
        hub,
        presence: yield* Presence,
        guilds: yield* Guilds,
        commands: yield* Commands,
        ingress: yield* Ingress,
        activity: yield* Activity,
        runBackground: background.run,
        runPromise: background.runPromise,
      });
    }),
  ).pipe(Layer.provide(ReplicaTasksLive));
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

const GatewayApplicationLive = GatewayApplication.layerWithoutDependencies.pipe(
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
  [
    "token",
    "ticket",
    "authorization",
    "access_token",
    "api_key",
    "apiKey",
    "x-api-key",
  ].some((key) => url.searchParams.has(key));

interface UpgradeServer {
  readonly upgrade: (
    request: Request,
    options: {
      readonly data: SessionData;
      readonly headers?: HeadersInit;
    },
  ) => boolean;
}

const probePaths = new Set(["/healthz", "/readyz"]);

export const createGatewayFetch = (
  application: GatewayHttpDependencies &
    Pick<GatewayApplicationService, "auth" | "runPromise"> & {
      config: Pick<GatewayConfiguration, "websocketPath" | "environment">;
    },
  httpHandler?: (request: Request) => Promise<Response>,
) => {
  let defaultBoundary: ReturnType<typeof makeGatewayHttpBoundary> | undefined;

  const handleHttp =
    httpHandler ??
    ((request: Request) => {
      defaultBoundary ??= makeGatewayHttpBoundary(application);

      return defaultBoundary.handler(request);
    });

  return async (
    request: Request,
    activeServer: UpgradeServer,
  ): Promise<Response | undefined> => {
    const url = new URL(request.url);
    const startedAt = performance.now();
    let status = 500;

    const isPresenceRead = isOrganizationPresencePath(url.pathname);

    const route = isPresenceRead
      ? ORGANIZATION_PRESENCE_ROUTE
      : probePaths.has(url.pathname) ||
          url.pathname === application.config.websocketPath
        ? url.pathname
        : undefined;

    const complete = (response: Response | undefined) => {
      status = response?.status ?? 101;

      return response;
    };

    const handle = async () => {
      if (probePaths.has(url.pathname) || isPresenceRead) {
        return complete(await handleHttp(request));
      }

      if (url.pathname !== application.config.websocketPath) {
        return complete(new Response("Not found", { status: 404 }));
      }

      // Refuse before auth work so the client retries against a ready replica.
      if (application.hub.unavailableReason() !== undefined) {
        return complete(
          new Response("Gateway unavailable", {
            status: 503,
            headers: { "retry-after": "1" },
          }),
        );
      }

      if (hasCredentialQuery(url)) {
        return complete(
          new Response("Credentials are not accepted in the URL", {
            status: 400,
          }),
        );
      }

      const origin = request.headers.get("origin");
      const identity = application.auth.readIdentity(request);

      if (
        !(origin === null && identity?.apiKeyAccess) &&
        !application.auth.isAllowedOrigin(origin)
      ) {
        return complete(new Response("Origin not allowed", { status: 403 }));
      }

      if (!identity)
        return complete(new Response("Unauthorized", { status: 401 }));

      const connectionId = crypto.randomUUID();

      const offeredProtocols =
        request.headers
          .get("sec-websocket-protocol")
          ?.split(",")
          .map((protocol) => protocol.trim()) ?? [];

      if (!offeredProtocols.includes(REALTIME_JSON_SUBPROTOCOL)) {
        return complete(
          new Response(
            `The ${REALTIME_JSON_SUBPROTOCOL} subprotocol is required`,
            {
              status: 400,
            },
          ),
        );
      }

      const upgraded = activeServer.upgrade(request, {
        data: {
          ...identity,
          connectionId,
          platform: identity.apiKeyAccess
            ? "web-app"
            : application.auth.getPlatform(origin ?? ""),
          userAgent: request.headers.get("user-agent") ?? undefined,
          joined: false,
          guilds: [],
          subscriptions: new Map(),
          airTagScopes: [],
          confidence: "reported",
        },
        headers: { "sec-websocket-protocol": REALTIME_JSON_SUBPROTOCOL },
      });

      return complete(
        upgraded
          ? undefined
          : new Response("WebSocket upgrade failed", { status: 400 }),
      );
    };

    try {
      if (probePaths.has(url.pathname)) return await handle();
      const baseRequestAttributes = { "http.request.method": request.method };

      const requestAttributes =
        route === undefined
          ? baseRequestAttributes
          : { ...baseRequestAttributes, "http.route": route };

      const result = await application.runPromise(
        Effect.tryPromise({ try: handle, catch: (cause) => cause }).pipe(
          Effect.onExit(() =>
            Effect.annotateCurrentSpan("http.response.status_code", status),
          ),
          Effect.withSpan(`http.server ${request.method}`, {
            kind: "server",
            parent: Option.getOrUndefined(
              HttpTraceContext.fromHeaders(Headers.fromInput(request.headers)),
            ),
            attributes: requestAttributes,
          }),
          Effect.match({
            onSuccess: (value) => ({ ok: true as const, value }),
            onFailure: (error) => ({ ok: false as const, error }),
          }),
        ),
      );

      if (!result.ok) throw result.error;

      return result.value;
    } finally {
      await application.runPromise(
        recordHttpServerMetrics({
          method: request.method,
          route,
          status,
          durationMilliseconds: performance.now() - startedAt,
        }),
      );
    }
  };
};

export const createGatewayWebSocket = (
  application: Pick<GatewayApplicationService, "hub" | "ingress">,
  metrics = new GatewayConnectionMetrics(),
) =>
  ({
    perMessageDeflate: false,
    maxPayloadLength: 256 * 1_024,
    idleTimeout: 70,
    open(socket: GatewaySocket) {
      // Federation can drop between the upgrade check and this callback.
      if (application.hub.unavailableReason() !== undefined) {
        socket.close(
          REALTIME_SERVER_CLOSE_CODES.tryAgainLater,
          "gateway unavailable",
        );

        return;
      }

      if (!application.ingress.open(socket)) {
        socket.close(
          REALTIME_SERVER_CLOSE_CODES.tryAgainLater,
          "connection capacity exceeded",
        );

        return;
      }

      metrics.open(socket);
      application.hub.register(socket);

      application.hub.sendEvent(socket, {
        v: 1,
        type: "session.hello",
        data: { connectionId: socket.data.connectionId },
      });
    },
    message(socket: GatewaySocket, message: string | Buffer) {
      application.ingress.message(socket, message);
    },
    close(socket: GatewaySocket, code = 1005, reason = "") {
      metrics.close(socket, code, reason);
      application.hub.detach(socket);
      application.ingress.close(socket);
    },
  }) satisfies Bun.WebSocketHandler<SessionData>;

interface DrainTiming {
  /** Lets Traefik drop the terminating endpoint before sockets move. */
  readonly endpointRemoval: Duration.Input;
  /** Spreads reconnects so the remaining replicas absorb joins gradually. */
  readonly closeSpread: Duration.Input;
  /** Bounds disconnect cleanup: presence removal and DISCONNECT activity. */
  readonly cleanup: Duration.Input;
}

// Keep the sum below terminationGracePeriodSeconds in the infra repository.
const deployedDrainTiming: DrainTiming = {
  endpointRemoval: "5 seconds",
  closeSpread: "10 seconds",
  cleanup: "10 seconds",
};

const localDrainTiming: DrainTiming = {
  endpointRemoval: 0,
  closeSpread: 0,
  cleanup: "2 seconds",
};

/** Moves every local session to another replica before the server stops. */
export const drainGateway = (
  application: Pick<GatewayApplicationService, "hub" | "ingress">,
  timing: DrainTiming,
) =>
  Effect.gen(function* () {
    application.hub.startDraining();
    yield* Effect.logInfo("Gateway draining").pipe(
      Effect.annotateLogs({
        sockets: application.hub.getLocalSockets().length,
      }),
    );
    yield* Effect.sleep(timing.endpointRemoval);

    yield* closeGradually(
      application.hub.getLocalSockets(),
      Duration.toMillis(timing.closeSpread),
      (socket) =>
        socket.close(
          REALTIME_SERVER_CLOSE_CODES.restarting,
          "gateway restarting",
        ),
    );

    const cleaned = yield* Effect.sleep("50 millis").pipe(
      Effect.repeat({
        until: () =>
          application.ingress.getDiagnostics().retainedConnections === 0,
      }),
      Effect.timeoutOption(timing.cleanup),
    );

    if (Option.isNone(cleaned))
      yield* Effect.logWarning("Gateway drain cleanup timed out").pipe(
        Effect.annotateLogs(application.ingress.getDiagnostics()),
      );
  });

export const GatewayServer = Layer.effectDiscard(
  Effect.gen(function* () {
    const application = yield* GatewayApplication;

    const httpBoundary = yield* Effect.acquireRelease(
      Effect.sync(() => makeGatewayHttpBoundary(application)),
      (boundary) => Effect.tryPromise(boundary.dispose).pipe(Effect.orDie),
    );

    const fetch = createGatewayFetch(application, httpBoundary.handler);

    const server = yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve<SessionData>({
          hostname: "0.0.0.0",
          port: application.config.port,
          fetch,
          websocket: createGatewayWebSocket(application),
        }),
      ),
      (activeServer) =>
        drainGateway(
          application,
          application.config.environment === "local"
            ? localDrainTiming
            : deployedDrainTiming,
        ).pipe(
          Effect.andThen(Effect.tryPromise(() => activeServer.stop(true))),
          Effect.orDie,
        ),
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
