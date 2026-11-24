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
  readonly config: Effect.Effect<ServiceIdentity, unknown>;
  readonly application: Layer.Layer<never, E, R>;
} & ([R] extends [never]
  ? { readonly supervise?: undefined }
  : {
      readonly supervise: (
        program: Effect.Effect<never, E, R>,
      ) => Effect.Effect<never, unknown, never>;
    });

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

export const healthGroup = () =>
  HttpApiGroup.make("health").add(
    HttpApiEndpoint.get("HealthzControllerHealthCheck", "/healthz", {
      success: HttpApiSchema.Empty(200),
    })
      .annotate(OpenApi.Identifier, "HealthzController_healthCheck")
      .annotate(OpenApi.Summary, "Health check"),
  );

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

export const serviceHttpServer = <A, E, R>(options: {
  readonly routes: Layer.Layer<A, E, R>;
  readonly port: number;
  readonly middleware?: HttpMiddleware.HttpMiddleware;
}) => {
  const inner = options.middleware;
  const routes = options.routes.pipe(Layer.provide(httpServerRouteMetrics));
  const measured = HttpRouter.serve(routes, { middleware: httpServerMetrics });

  const served: typeof measured =
    inner === undefined
      ? measured
      : HttpRouter.serve(routes, {
          middleware: (effect) => httpServerMetrics(inner(effect)),
        });

  return served.pipe(
    Layer.provide(
      BunHttpServer.layer({ hostname: "0.0.0.0", port: options.port }),
    ),
  );
};
