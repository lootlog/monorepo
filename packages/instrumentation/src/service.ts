import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import {
  type HttpMiddleware,
  HttpRouter,
  HttpServerResponse,
} from "effect/http";
import {
  type HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import {
  httpServerMetrics,
  httpServerRouteMetrics,
  installScopedLogRunner,
} from "./instrumentation.js";
import { observabilityLayer, type ServiceIdentity } from "./observability.js";

type RunServiceOptions<E, R> = {
  /** The service's own configuration, with every requirement provided. */
  readonly config: Effect.Effect<ServiceIdentity, unknown>;
  readonly application: Layer.Layer<never, E, R>;
} & ([R] extends [never]
  ? { readonly supervise?: undefined }
  : {
      /**
       * Ends the process when a runtime dependency, such as the RabbitMQ
       * connection, fails after start.
       */
      readonly supervise: (
        program: Effect.Effect<never, E, R>,
      ) => Effect.Effect<never, unknown, never>;
    });

/**
 * Starts a backend service: observability from its configuration, scoped
 * logging for code outside Effect, and the application layer until shutdown.
 */
export const runService = <E, R>(options: RunServiceOptions<E, R>): void => {
  const program = Effect.gen(function* () {
    yield* installScopedLogRunner;

    return yield* Layer.launch(options.application);
  }).pipe(Effect.scoped);

  // SAFETY: without `supervise`, the options type requires `R` to be `never`.
  const supervised: Effect.Effect<never, unknown> =
    options.supervise === undefined
      ? (program as Effect.Effect<never, E>)
      : options.supervise(program);

  BunRuntime.runMain(
    supervised.pipe(Effect.provide(observabilityLayer(options.config))),
  );
};

/** The standard `/healthz` liveness group every HTTP service exposes. */
export const healthGroup = (description?: string) => {
  const endpoint = HttpApiEndpoint.get(
    "HealthzControllerHealthCheck",
    "/healthz",
    {
      success: HttpApiSchema.Empty(200),
    },
  )
    .annotate(OpenApi.Identifier, "HealthzController_healthCheck")
    .annotate(OpenApi.Summary, "Health check");

  return HttpApiGroup.make("health").add(
    description === undefined
      ? endpoint
      : endpoint.annotate(OpenApi.Description, description),
  );
};

/**
 * The service's HTTP API with its generated document at `/openapi.json` and,
 * when given, the committed YAML document at `/doc`.
 */
export const serviceApiRoutes = <
  Id extends string,
  Groups extends HttpApiGroup.Constraint,
>(
  api: HttpApi.HttpApi<Id, Groups>,
  options?: { readonly documentation?: URL },
) => {
  const routes = HttpApiBuilder.layer(api, { openapiPath: "/openapi.json" });
  const documentation = options?.documentation;

  if (documentation === undefined) return routes;

  return Layer.merge(
    routes,
    HttpRouter.add(
      "GET",
      "/doc",
      HttpServerResponse.raw(Bun.file(documentation), {
        contentType: "application/yaml",
      }),
    ),
  );
};

/**
 * Serves routes on `0.0.0.0:port` with route and request metrics. An extra
 * middleware runs inside the metrics middleware, so its outcome is measured.
 */
export const serviceHttpServer = <A, E, R>(options: {
  readonly routes: Layer.Layer<A, E, R>;
  readonly port: number;
  readonly middleware?: HttpMiddleware.HttpMiddleware;
}) => {
  const inner = options.middleware;

  return HttpRouter.serve(
    options.routes.pipe(Layer.provide(httpServerRouteMetrics)),
    {
      middleware:
        inner === undefined
          ? httpServerMetrics
          : (effect) => httpServerMetrics(inner(effect)),
    },
  ).pipe(
    Layer.provide(
      BunHttpServer.layer({ hostname: "0.0.0.0", port: options.port }),
    ),
  );
};
