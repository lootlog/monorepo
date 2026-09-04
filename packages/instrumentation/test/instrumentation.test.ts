import { describe, expect, test } from "bun:test";
import { Effect, Fiber, Layer, Logger, Metric } from "effect";
import {
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "effect/unstable/http";
import {
  httpServerDuration,
  httpServerMetrics,
  httpServerRequestCount,
  installScopedLogRunner,
  recordHttpServerMetrics,
  runLogEffect,
} from "../src/instrumentation.js";

test("the scoped log runner preserves the configured logger", async () => {
  const messages: unknown[] = [];
  const logger = Logger.make(({ message }) => {
    messages.push(message);
  });

  await Effect.runPromise(
    Effect.gen(function* () {
      yield* installScopedLogRunner;
      yield* Fiber.join(runLogEffect(Effect.logInfo("scoped log")));
    }).pipe(Effect.scoped, Effect.provide(Logger.layer([logger]))),
  );

  expect(messages).toHaveLength(1);
});

describe("HTTP server metrics", () => {
  test("silences healthcheck access logs while preserving responses, metrics and other request logs", async () => {
    const messages: unknown[] = [];
    const logger = Logger.make(({ message }) => messages.push(message));
    const boundary = HttpRouter.toWebHandler(
      HttpRouter.add(
        "GET",
        "/*",
        HttpServerResponse.empty({ status: 202 }),
      ).pipe(
        Layer.provide(HttpServer.layerServices),
        Layer.merge(Logger.layer([logger])),
      ),
      { middleware: httpServerMetrics },
    );
    const counter = Metric.withAttributes(httpServerRequestCount, {
      "http.request.method": "GET",
      "http.response.status_code": "202",
    });
    const before = await Effect.runPromise(Metric.value(counter));
    try {
      const healthResponses = await Promise.all(
        ["/healthz", "/healthz?probe=readiness"].map((path) =>
          boundary.handler(new Request(`http://localhost${path}`)),
        ),
      );
      expect(healthResponses.map((response) => response.status)).toEqual([
        202, 202,
      ]);
      expect(messages).toHaveLength(0);
      const after = await Effect.runPromise(Metric.value(counter));
      expect(after.count - before.count).toBe(2);

      const otherResponses = await Promise.all(
        ["/healthz-other", "/users"].map((path) =>
          boundary.handler(new Request(`http://localhost${path}`)),
        ),
      );
      expect(otherResponses.map((response) => response.status)).toEqual([
        202, 202,
      ]);
      expect(messages).toHaveLength(2);
    } finally {
      await boundary.dispose();
    }
  });

  test("records request count and duration with bounded HTTP attributes", async () => {
    const attributes = {
      "http.request.method": "GET",
      "http.response.status_code": "204",
      "http.route": "/healthz",
    };

    await Effect.runPromise(
      recordHttpServerMetrics({
        method: "GET",
        route: "/healthz",
        status: 204,
        durationMilliseconds: 12,
      }),
    );

    const [count, duration] = await Effect.runPromise(
      Effect.all([
        Metric.value(Metric.withAttributes(httpServerRequestCount, attributes)),
        Metric.value(Metric.withAttributes(httpServerDuration, attributes)),
      ]),
    );
    expect(count.count).toBe(1);
    expect(duration.count).toBe(1);
    expect(duration.sum).toBe(12);
  });
});
