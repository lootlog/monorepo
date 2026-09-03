import { Clock, Effect, Metric } from "effect";
import { HttpMiddleware, HttpServerRequest } from "effect/unstable/http";

const durationBoundaries = [
  5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000,
];

export const httpServerDuration = Metric.histogram("http.server.duration", {
  description: "HTTP server request duration in milliseconds",
  boundaries: durationBoundaries,
});

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
  const attributes = {
    "http.request.method": input.method,
    "http.response.status_code": String(input.status),
    ...(input.route === undefined ? {} : { "http.route": input.route }),
  };
  return Effect.all(
    [
      Metric.update(
        Metric.withAttributes(httpServerDuration, attributes),
        input.durationMilliseconds,
      ),
      Metric.update(
        Metric.withAttributes(httpServerRequestCount, attributes),
        1,
      ),
    ],
    { discard: true },
  );
};

export const httpServerMetrics = HttpMiddleware.make((httpApp) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const startedAt = yield* Clock.currentTimeMillis;
    const response = yield* httpApp;
    const completedAt = yield* Clock.currentTimeMillis;
    yield* recordHttpServerMetrics({
      method: request.method,
      status: response.status,
      durationMilliseconds: completedAt - startedAt,
    });
    return response;
  }),
);
