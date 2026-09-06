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
        "/healthz",
        HttpServerResponse.empty({ status: 202 }),
      ).pipe(
        Layer.merge(
          HttpRouter.add(
            "GET",
            "/*",
            HttpServerResponse.empty({ status: 204 }),
          ),
        ),
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
      const healthPaths = [
        "/healthz",
        "/healthz?probe=readiness",
        "/healthz/",
        "/HEALTHZ",
        "//healthz",
        "///HeAlThZ///?probe=readiness",
      ];
      const healthResponses = await Promise.all(
        healthPaths.map((path) =>
          boundary.handler(new Request(`http://localhost${path}`)),
        ),
      );
      expect(healthResponses.map((response) => response.status)).toEqual(
        healthPaths.map(() => 202),
      );
      expect(messages).toHaveLength(0);
      const after = await Effect.runPromise(Metric.value(counter));
      expect(after.count - before.count).toBe(healthPaths.length);

      const otherResponses = await Promise.all(
        ["/healthz-other", "/healthz/other", "/users"].map((path) =>
          boundary.handler(new Request(`http://localhost${path}`)),
        ),
      );
      expect(otherResponses.map((response) => response.status)).toEqual([
        204, 204, 204,
      ]);
      expect(messages).toHaveLength(3);
    } finally {
      await boundary.dispose();
    }
  });

  test("records failed responses and interruptions without changing their status", async () => {
    const routes = [
      { path: "/defect", status: 500, effect: Effect.die(new Error("failed")) },
      {
        path: "/response",
        status: 418,
        effect: Effect.die(HttpServerResponse.empty({ status: 418 })),
      },
      { path: "/interrupt", status: 503, effect: Effect.interrupt },
    ] as const;
    const boundary = HttpRouter.toWebHandler(
      Layer.mergeAll(
        HttpRouter.add("GET", routes[0].path, routes[0].effect),
        HttpRouter.add("GET", routes[1].path, routes[1].effect),
        HttpRouter.add("GET", routes[2].path, routes[2].effect),
      ).pipe(Layer.provide(HttpServer.layerServices)),
      { disableLogger: true, middleware: httpServerMetrics },
    );
    try {
      await Promise.all(
        routes.map(async ({ path, status }) => {
          const attributes = {
            "http.request.method": "GET",
            "http.response.status_code": String(status),
          };
          const counter = Metric.withAttributes(
            httpServerRequestCount,
            attributes,
          );
          const histogram = Metric.withAttributes(
            httpServerDuration,
            attributes,
          );
          const before = await Effect.runPromise(
            Effect.all([Metric.value(counter), Metric.value(histogram)]),
          );
          const response = await boundary.handler(
            new Request(`http://localhost${path}`),
          );
          expect(response.status).toBe(status);
          const after = await Effect.runPromise(
            Effect.all([Metric.value(counter), Metric.value(histogram)]),
          );
          expect(after[0].count - before[0].count).toBe(1);
          expect(after[1].count - before[1].count).toBe(1);
        }),
      );
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
