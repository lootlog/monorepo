import { Clock, Context, Effect, FiberSet, Metric } from "effect";
import {
  HttpMiddleware,
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
  type HttpServerResponse,
} from "effect/unstable/http";
import { currentLogSpan } from "./logging.js";

const durationBoundaries = [
  0.005,
  0.01,
  0.025,
  0.05,
  0.1,
  0.25,
  0.5,
  1,
  2.5,
  5,
  10,
  Infinity,
];

const defaultLogRunner = (effect: Effect.Effect<void>) =>
  Effect.runFork(effect);
let logRunner = defaultLogRunner;

export const runLogEffect = (effect: Effect.Effect<void>) => {
  const span = currentLogSpan();
  return logRunner(span ? Effect.withParentSpan(effect, span) : effect);
};

export const installScopedLogRunner = Effect.gen(function* () {
  const previous = logRunner;
  logRunner = yield* FiberSet.makeRuntime<never, void, never>();
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      logRunner = previous;
    }),
  );
});

export const httpServerDuration = Metric.histogram(
  "http.server.request.duration",
  {
    description: "HTTP server request duration in seconds",
    boundaries: durationBoundaries,
    attributes: { unit: "s" },
  },
);

export const httpServerRequestCount = Metric.counter(
  "http.server.request.count",
  { description: "HTTP server requests", incremental: true },
);

export const recordHttpServerMetrics = (input: {
  readonly method: string;
  readonly route?: string;
  readonly status: number;
  readonly durationMilliseconds: number;
}) => {
  if (input.route !== undefined && isHealthcheck(input.route))
    return Effect.void;
  const methodAttributes = {
    "http.request.method": input.method,
    "http.response.status_code": String(input.status),
  };
  const attributes =
    input.route === undefined
      ? methodAttributes
      : { ...methodAttributes, "http.route": input.route };
  return Effect.all(
    [
      Metric.update(
        Metric.withAttributes(httpServerDuration, attributes),
        input.durationMilliseconds / 1_000,
      ),
      Metric.update(
        Metric.withAttributes(httpServerRequestCount, attributes),
        1,
      ),
    ],
    { discard: true },
  );
};

interface RequestMetricsState {
  route?: string;
}

const RequestMetrics = Context.Reference<RequestMetricsState | undefined>(
  "@lootlog/instrumentation/RequestMetrics",
  { defaultValue: () => undefined },
);

// Capture the matched template before HttpEffect restores the request context.
export const httpServerRouteMetrics = HttpRouter.middleware(
  <E, R>(httpApp: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) =>
    Effect.gen(function* () {
      const metrics = yield* RequestMetrics;
      const { route } = yield* HttpRouter.RouteContext;
      if (metrics) metrics.route = route.path;
      return yield* httpApp;
    }),
).layer;

export const isHealthcheck = (url: string) =>
  /^\/+healthz\/*(?:[?#]|$)/i.test(url);

export const httpServerMetrics = HttpMiddleware.make(
  <E, R>(
    httpApp: Effect.Effect<
      HttpServerResponse.HttpServerResponse,
      E,
      R | HttpServerRequest.HttpServerRequest
    >,
  ) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      if (isHealthcheck(request.url)) {
        return yield* HttpMiddleware.withLoggerDisabled(httpApp);
      }
      const startedAt = yield* Clock.currentTimeNanos;
      const metrics: RequestMetricsState = {};
      return yield* httpApp.pipe(
        Effect.onExit((exit) =>
          Effect.gen(function* () {
            const completedAt = yield* Clock.currentTimeNanos;
            yield* recordHttpServerMetrics({
              route: metrics.route,
              method: request.method,
              status: HttpServerError.exitResponse(exit).status,
              durationMilliseconds: Number(completedAt - startedAt) / 1_000_000,
            });
          }),
        ),
        Effect.provideService(RequestMetrics, metrics),
      );
    }),
);
