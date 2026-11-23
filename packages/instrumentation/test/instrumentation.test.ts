import { describe, expect, test } from "bun:test";
import {
  API_KEY_ACCESS_HEADER,
  AUTH_DISCORD_ID_HEADER,
  AUTH_USER_ID_HEADER,
} from "@lootlog/schema/api-key-access";
import { Effect, Fiber, Layer, Logger, Metric, References } from "effect";
import { HttpRouter, HttpServer, HttpServerResponse } from "effect/http";
import {
  httpServerDuration,
  httpServerMetrics,
  httpServerRouteMetrics,
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
  test("serves healthcheck-lookalike paths as ordinary requests without access logs for fast successes", async () => {
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
            "/readyz",
            HttpServerResponse.empty({ status: 202 }),
          ),
        ),
        Layer.merge(
          HttpRouter.add(
            "GET",
            "/*",
            HttpServerResponse.empty({ status: 204 }),
          ),
        ),
        Layer.provide(HttpServer.layerServices),
        Layer.provide(httpServerRouteMetrics),
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
        "/readyz",
        "/readyz?probe=readiness",
        "/readyz/",
        "/READYZ",
        "//readyz",
        "///ReAdYz///?probe=readiness",
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
      expect(after.count - before.count).toBe(0);

      const otherResponses = await Promise.all(
        [
          "/healthz-other",
          "/healthz/other",
          "/readyz-other",
          "/readyz/other",
          "/users",
        ].map((path) =>
          boundary.handler(new Request(`http://localhost${path}`)),
        ),
      );

      expect(otherResponses.map((response) => response.status)).toEqual([
        204, 204, 204, 204, 204,
      ]);
      expect(messages).toHaveLength(0);
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
      ).pipe(
        Layer.provide(HttpServer.layerServices),
        Layer.provide(httpServerRouteMetrics),
      ),
      { disableLogger: true, middleware: httpServerMetrics },
    );

    try {
      await Promise.all(
        routes.map(async ({ path, status }) => {
          const attributes = {
            "http.request.method": "GET",
            "http.response.status_code": String(status),
            "http.route": path,
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

  test("groups dynamic paths by router template and leaves unknown paths unlabelled", async () => {
    const boundary = HttpRouter.toWebHandler(
      HttpRouter.add("GET", "/widgets/:id", HttpServerResponse.empty()).pipe(
        Layer.provide(HttpServer.layerServices),
        Layer.provide(httpServerRouteMetrics),
      ),
      { disableLogger: true, middleware: httpServerMetrics },
    );

    const metric = Metric.withAttributes(httpServerRequestCount, {
      "http.request.method": "GET",
      "http.response.status_code": "204",
      "http.route": "/widgets/:id",
    });

    const before = await Effect.runPromise(Metric.value(metric));

    try {
      const responses = await Promise.all(
        ["/widgets/123?secret=hidden", "/widgets/456"].map((path) =>
          boundary.handler(new Request(`http://localhost${path}`)),
        ),
      );

      expect(responses.map((response) => response.status)).toEqual([204, 204]);
      expect(
        (await Effect.runPromise(Metric.value(metric))).count - before.count,
      ).toBe(2);

      const missing = Metric.withAttributes(httpServerRequestCount, {
        "http.request.method": "GET",
        "http.response.status_code": "404",
      });

      const missingBefore = await Effect.runPromise(Metric.value(missing));
      expect(
        (await boundary.handler(new Request("http://localhost/private/123")))
          .status,
      ).toBe(404);
      expect(
        (await Effect.runPromise(Metric.value(missing))).count -
          missingBefore.count,
      ).toBe(1);
    } finally {
      await boundary.dispose();
    }
  });

  test("records request count and duration with bounded HTTP attributes", async () => {
    const attributes = {
      "http.request.method": "GET",
      "http.response.status_code": "204",
      "http.route": "/users/:id",
    };

    await Effect.runPromise(
      recordHttpServerMetrics({
        method: "GET",
        route: "/users/:id",
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
    expect(duration.sum).toBe(0.012);
  });

  test("logs each rejected request once with its error code and caller", async () => {
    const annotations: unknown[] = [];

    const logger = Logger.make(({ fiber }) => {
      annotations.push(fiber.getRef(References.CurrentLogAnnotations));
    });

    const boundary = HttpRouter.toWebHandler(
      HttpRouter.add(
        "POST",
        "/loots",
        HttpServerResponse.jsonUnsafe(
          { code: "NPC_WT_TOO_LOW", message: "Rejected" },
          { status: 400 },
        ),
      ).pipe(
        Layer.merge(
          HttpRouter.add(
            "GET",
            "/members",
            Effect.die(
              HttpServerResponse.jsonUnsafe(
                { code: "FORBIDDEN" },
                { status: 403 },
              ),
            ),
          ),
        ),
        Layer.provide(HttpServer.layerServices),
        Layer.provide(httpServerRouteMetrics),
        Layer.merge(Logger.layer([logger])),
      ),
      { middleware: httpServerMetrics },
    );

    try {
      await boundary.handler(
        new Request("http://localhost/loots?world=x", { method: "POST" }),
      );
      await boundary.handler(
        new Request("http://localhost/members", {
          headers: {
            [AUTH_USER_ID_HEADER]: "user-1",
            [AUTH_DISCORD_ID_HEADER]: "discord-1",
            [API_KEY_ACCESS_HEADER]: JSON.stringify({
              keyId: "key-1",
              organizationIds: [],
              mode: "read",
              personalData: false,
              expiresAt: null,
            }),
            "user-agent": "integration-script/1.0",
          },
        }),
      );

      expect(annotations).toEqual([
        {
          "http.method": "POST",
          "http.url": "/loots",
          "http.status": 400,
          "http.error_code": "NPC_WT_TOO_LOW",
        },
        {
          "http.method": "GET",
          "http.url": "/members",
          "http.status": 403,
          "http.error_code": "FORBIDDEN",
          "user.id": "user-1",
          "api_key.id": "key-1",
          "user_agent.original": "integration-script/1.0",
        },
      ]);
    } finally {
      await boundary.dispose();
    }
  });

  test("logs an aborted client request as a response, not a failure", async () => {
    const messages: unknown[] = [];
    const logger = Logger.make(({ message }) => messages.push(message));
    const started = Promise.withResolvers<void>();

    const boundary = HttpRouter.toWebHandler(
      HttpRouter.add(
        "GET",
        "/aborted",
        Effect.sync(() => started.resolve()).pipe(Effect.andThen(Effect.never)),
      ).pipe(
        Layer.provide(HttpServer.layerServices),
        Layer.provide(httpServerRouteMetrics),
        Layer.merge(Logger.layer([logger])),
      ),
      { middleware: httpServerMetrics },
    );

    const counter = Metric.withAttributes(httpServerRequestCount, {
      "http.request.method": "GET",
      "http.response.status_code": "499",
      "http.route": "/aborted",
    });

    try {
      const before = await Effect.runPromise(Metric.value(counter));
      const controller = new AbortController();

      const response = boundary.handler(
        new Request("http://localhost/aborted", { signal: controller.signal }),
      );

      await started.promise;
      controller.abort();
      expect((await response).status).toBe(499);
      expect(messages).toEqual([["Sent HTTP response"]]);
      expect(
        (await Effect.runPromise(Metric.value(counter))).count - before.count,
      ).toBe(1);
    } finally {
      await boundary.dispose();
    }
  });
});
