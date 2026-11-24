import { readForwardAuthIdentity } from "@lootlog/schema/api-key-policy";
import {
  Cause,
  Clock,
  Context,
  Effect,
  Exit,
  FiberSet,
  Metric,
  Option,
  Schema,
} from "effect";
import {
  HttpBody,
  HttpMiddleware,
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
  type HttpServerResponse,
} from "effect/http";
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

export class ContextLogger {
  constructor(private readonly context: string) {}

  debug(message: string, ...details: unknown[]): void {
    this.run(Effect.logDebug(message, ...details));
  }

  info(message: string, ...details: unknown[]): void {
    this.run(Effect.logInfo(message, ...details));
  }

  warn(message: string, ...details: unknown[]): void {
    this.run(Effect.logWarning(message, ...details));
  }

  error(message: string, ...details: unknown[]): void {
    this.run(Effect.logError(message, ...details));
  }

  private run(effect: Effect.Effect<void>): void {
    runLogEffect(effect.pipe(Effect.annotateLogs({ context: this.context })));
  }
}

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
  {
    description: "HTTP server requests, excluding health checks",
    incremental: true,
  },
);

export const recordHttpServerMetrics = (input: {
  readonly method: string;
  readonly route?: string | undefined;
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
  route?: string | undefined;
}

const RequestMetrics = Context.Reference<RequestMetricsState | undefined>(
  "@lootlog/instrumentation/RequestMetrics",
  { defaultValue: () => undefined },
);

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
  /^\/+(?:healthz|readyz)\/*(?:[?#]|$)/i.test(url);

const slowRequestLogThresholdMilliseconds = 1_000;

const ErrorResponseCode = Schema.fromJsonString(
  Schema.Struct({ code: Schema.String }),
);

const decodeErrorResponseCode = Schema.decodeUnknownOption(ErrorResponseCode);

const maxErrorResponseCodeBodyBytes = 4_096;

const errorResponseCode = (response: HttpServerResponse.HttpServerResponse) => {
  const { body } = response;

  if (
    response.status < 400 ||
    !(body instanceof HttpBody.Uint8Array) ||
    !body.contentType.endsWith("json") ||
    body.contentLength > maxErrorResponseCodeBodyBytes
  ) {
    return undefined;
  }

  return Option.getOrUndefined(
    decodeErrorResponseCode(body.text ?? new TextDecoder().decode(body.body)),
  )?.code;
};

const requestPath = (url: string) => url.split(/[?#]/u, 1)[0];

const httpCallerAnnotations = (
  request: HttpServerRequest.HttpServerRequest,
) => {
  const identity = readForwardAuthIdentity(request.headers);

  return {
    "user.id": identity?.userId,
    "api_key.id": identity?.apiKey?.keyId,
    "user_agent.original": request.headers["user-agent"],
  };
};

const isClientAbortOnly = (cause: Cause.Cause<unknown>) =>
  cause.reasons.every(
    (reason) =>
      Cause.isInterruptReason(reason) &&
      reason.annotations.has(HttpServerError.ClientAbort.key),
  );

const logHttpResponse = (
  request: HttpServerRequest.HttpServerRequest,
  exit: Exit.Exit<HttpServerResponse.HttpServerResponse, unknown>,
) => {
  const [response, cause] = Exit.isFailure(exit)
    ? HttpServerError.causeResponseStripped(exit.cause)
    : [exit.value, Option.none()];

  const message =
    Option.isSome(cause) && !isClientAbortOnly(cause.value)
      ? cause.value
      : "Sent HTTP response";

  const annotations = {
    "http.method": request.method,
    "http.url": requestPath(request.url),
    "http.status": response.status,
    "http.error_code": errorResponseCode(response),
    ...httpCallerAnnotations(request),
  };

  return Effect.log(message).pipe(
    Effect.annotateLogs(
      Object.fromEntries(
        Object.entries(annotations).filter(([, value]) => value !== undefined),
      ),
    ),
  );
};

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

      return yield* HttpMiddleware.withLoggerDisabled(httpApp).pipe(
        Effect.onExit((exit) =>
          Effect.gen(function* () {
            const completedAt = yield* Clock.currentTimeNanos;
            const status = HttpServerError.exitResponse(exit).status;

            const durationMilliseconds =
              Number(completedAt - startedAt) / 1_000_000;

            yield* recordHttpServerMetrics({
              route: metrics.route,
              method: request.method,
              status,
              durationMilliseconds,
            });

            if (
              Exit.isFailure(exit) ||
              status >= 400 ||
              durationMilliseconds >= slowRequestLogThresholdMilliseconds
            ) {
              yield* logHttpResponse(request, exit);
            }
          }),
        ),
        Effect.provideService(RequestMetrics, metrics),
        Effect.withLogSpan("http.span"),
      );
    }),
);
