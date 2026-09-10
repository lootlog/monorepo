import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  Cause,
  ConfigProvider,
  Effect,
  Fiber,
  Layer,
  Schema,
  Tracer,
} from "effect";
import {
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "effect/unstable/http";
import { OtlpExporter } from "effect/unstable/observability";
import {
  httpServerMetrics,
  httpServerRouteMetrics,
  installScopedLogRunner,
  recordHttpServerMetrics,
  runLogEffect,
} from "../src/instrumentation.js";
import { makeObservabilityLayer } from "../src/observability.js";

const configuration = Effect.succeed({
  serviceName: "api",
  serviceNamespace: "lootlog-test",
  environment: "test",
});

const observability = (env: Record<string, string>) =>
  makeObservabilityLayer(configuration).pipe(
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(env))),
  );

const attribute = (key: string, value: string) => ({
  key,
  value: { stringValue: value },
});

const LogEntry = Schema.Struct({
  message: Schema.String,
  level: Schema.String,
  service: Schema.String,
  environment: Schema.String,
  commit: Schema.optional(Schema.String),
  context: Schema.optional(Schema.String),
  trace_id: Schema.optional(Schema.String),
  span_id: Schema.optional(Schema.String),
  details: Schema.Unknown,
});

const decodeLog = Schema.decodeUnknownSync(Schema.fromJsonString(LogEntry));

let logOutput: ReturnType<typeof spyOn<typeof console, "log">>;

beforeEach(() => {
  logOutput = spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => logOutput.mockRestore());

describe("observability contract", () => {
  test("local HTTP failures have a readable error level and multiline cause", async () => {
    await Effect.runPromise(
      Effect.log(Cause.die(new Error("undeclared Redis key"))).pipe(
        Effect.annotateLogs({
          "http.method": "POST",
          "http.url": "/messaging",
          "http.status": 500,
        }),
        Effect.provide(
          makeObservabilityLayer(
            Effect.succeed({
              serviceName: "api",
              serviceNamespace: "lootlog-test",
              environment: "local",
            }),
          ).pipe(
            Layer.provide(
              ConfigProvider.layer(ConfigProvider.fromEnvRecord({})),
            ),
          ),
        ),
      ),
    );

    const output = logOutput.mock.calls
      .map((parts) => parts.join(" "))
      .join("\n");

    expect(output).toContain("ERROR");
    expect(output).toContain("Error: undeclared Redis key\n");
    expect(output).toContain("/messaging");
    expect(output).not.toContain('"level":"info"');
  });

  test("exports seconds histograms and idle heartbeat with resource identity, only when metrics are enabled", async () => {
    const requests: Array<{ path: string; body: unknown }> = [];

    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        requests.push({
          path: new URL(request.url).pathname,
          body: await request.json(),
        });

        return Response.json({});
      },
    });

    try {
      const run = (env: Record<string, string>) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* recordHttpServerMetrics({
              method: "PUT",
              route: "/contract/:id",
              status: 201,
              durationMilliseconds: 250,
            });
            yield* recordHttpServerMetrics({
              method: "GET",
              route: "/slow/:id",
              status: 200,
              durationMilliseconds: 15000,
            });
            yield* (yield* OtlpExporter.Flusher).flush;
          }).pipe(
            Effect.provide(
              observability({
                OTEL_EXPORTER_OTLP_ENDPOINT: server.url.toString(),
                OTEL_SERVICE_INSTANCE_ID: "pod-contract",
                HOSTNAME: "ignored-host",
                COMMIT_SHA: "commit-contract",
                ...env,
              }),
            ),
          ),
        );

      await run({});
      expect(requests).toHaveLength(0);
      await run({ OTEL_METRICS_EXPORTER: "otlp" });
      expect(requests.every(({ path }) => path === "/v1/metrics")).toBe(true);
      expect(requests[0]?.body).toMatchObject({
        resourceMetrics: [
          {
            resource: {
              attributes: expect.arrayContaining([
                attribute("service.name", "api"),
                attribute("service.namespace", "lootlog-test"),
                attribute("service.instance.id", "pod-contract"),
                attribute("service.version", "commit-contract"),
                attribute("deployment.environment.name", "test"),
              ]),
            },
            scopeMetrics: [
              {
                metrics: expect.arrayContaining([
                  expect.objectContaining({
                    name: "http.server.request.duration",
                    unit: "s",
                    histogram: expect.objectContaining({
                      aggregationTemporality: 2,
                      dataPoints: expect.arrayContaining([
                        expect.objectContaining({
                          sum: 0.5,
                          count: 2,
                          explicitBounds: [
                            0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5,
                            10,
                          ],
                          attributes: expect.arrayContaining([
                            attribute("http.route", "/contract/:id"),
                            attribute("http.response.status_code", "201"),
                          ]),
                        }),
                        expect.objectContaining({
                          sum: 30,
                          count: 2,
                          bucketCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
                        }),
                      ]),
                    }),
                  }),
                  expect.objectContaining({
                    name: "lootlog.service.up",
                    unit: "",
                    gauge: expect.objectContaining({
                      dataPoints: expect.arrayContaining([
                        expect.objectContaining({ asDouble: 1 }),
                      ]),
                    }),
                  }),
                ]),
              },
            ],
          },
        ],
      });
      const exported = requests.length;
      await run({ OTEL_METRICS_EXPORTER: "none" });
      await run({ OTEL_METRICS_EXPORTER: "otlp", OTEL_SDK_DISABLED: "true" });
      expect(requests).toHaveLength(exported);
    } finally {
      await server.stop(true);
    }
  });

  test("writes one JSON log per entry and preserves Promise adapter span context", async () => {
    logOutput.mockImplementation(() => {});

    const parent = Tracer.externalSpan({
      traceId: "11111111111111111111111111111111",
      spanId: "2222222222222222",
      sampled: true,
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        yield* installScopedLogRunner;
        yield* Effect.logInfo("outside span");
        yield* Effect.tryPromise(async () => {
          await Promise.resolve();
          await Effect.runPromise(
            Fiber.join(
              runLogEffect(
                Effect.logError(
                  "database failed",
                  new Error("connection refused"),
                  { context: "Database" },
                ),
              ),
            ),
          );
        }).pipe(Effect.withSpan("database"), Effect.withParentSpan(parent));
      }).pipe(
        Effect.scoped,
        Effect.provide(observability({ COMMIT_SHA: "commit-log" })),
      ),
    );
    expect(logOutput.mock.calls).toHaveLength(2);
    const entries = logOutput.mock.calls.map(([line]) => decodeLog(line));
    expect(entries[0]).toMatchObject({
      message: "outside span",
      service: "api",
      environment: "test",
      level: "info",
      commit: "commit-log",
    });
    expect(entries[0]?.trace_id).toBeUndefined();
    expect(entries[1]).toMatchObject({
      service: "api",
      level: "error",
      context: "Database",
      trace_id: parent.traceId,
    });
    expect(entries[1]?.span_id).toMatch(/^[a-f0-9]{16}$/);
    expect(entries[1]?.message).toContain("connection refused");
    expect(JSON.stringify(entries[1]?.details)).toContain("connection refused");
  });

  test("isolates concurrent Promise logs and restores nested and absent spans", async () => {
    const expected = new Map<string, { traceId: string; spanId: string }>();

    const logFromPromise = (message: string) =>
      Effect.gen(function* () {
        const span = yield* Effect.currentSpan;
        expected.set(message, { traceId: span.traceId, spanId: span.spanId });
        yield* Effect.promise(async () => {
          await new Promise<void>((resolve) => setImmediate(resolve));
          await Effect.runPromise(
            Fiber.join(runLogEffect(Effect.logInfo(message))),
          );
        });
      });

    await Effect.runPromise(
      Effect.gen(function* () {
        yield* installScopedLogRunner;
        yield* Effect.forEach(
          ["first", "second"],
          (name) =>
            Effect.gen(function* () {
              yield* logFromPromise(`${name}-parent-before`);
              yield* logFromPromise(`${name}-child`).pipe(
                Effect.withSpan("child"),
              );
              yield* logFromPromise(`${name}-parent-after`);
            }).pipe(Effect.withSpan(name)),
          { concurrency: "unbounded" },
        );
        yield* Effect.promise(async () => {
          await new Promise<void>((resolve) => setImmediate(resolve));
          await Effect.runPromise(
            Fiber.join(runLogEffect(Effect.logInfo("untraced"))),
          );
        });
      }).pipe(Effect.scoped, Effect.provide(observability({}))),
    );
    const entries = logOutput.mock.calls.map(([line]) => decodeLog(line));
    expect(entries).toHaveLength(7);

    for (const entry of entries) {
      const span = expected.get(entry.message);
      expect(entry.trace_id).toBe(span?.traceId);
      expect(entry.span_id).toBe(span?.spanId);
    }

    for (const name of ["first", "second"]) {
      expect(expected.get(`${name}-parent-before`)).toEqual(
        expected.get(`${name}-parent-after`),
      );
      expect(expected.get(`${name}-child`)?.spanId).not.toBe(
        expected.get(`${name}-parent-before`)?.spanId,
      );
    }

    expect(expected.get("first-child")?.traceId).not.toBe(
      expected.get("second-child")?.traceId,
    );
  });

  test("HTTP propagates incoming trace context and logs correlate with exported spans", async () => {
    logOutput.mockImplementation(() => {});
    const payloads: unknown[] = [];

    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        payloads.push(await request.json());

        return Response.json({});
      },
    });

    const boundary = HttpRouter.toWebHandler(
      HttpRouter.add(
        "GET",
        "/trace/:id",
        Effect.gen(function* () {
          yield* Effect.logInfo("request handled");
          yield* Effect.annotateCurrentSpan(
            "http.request.header.x-late-secret",
            "late-secret",
          ).pipe(
            Effect.withSpan("adapter", {
              attributes: {
                "url.full": "https://example.com/?token=initial-secret",
                "http.response.header.x-initial-secret": "initial-secret",
                "adapter.operation": "callback",
              },
            }),
          );

          return HttpServerResponse.empty({
            headers: { "x-response-secret": "response-secret" },
          });
        }),
      ).pipe(
        Layer.provide(httpServerRouteMetrics),
        Layer.provide(HttpServer.layerServices),
        Layer.merge(
          observability({
            OTEL_EXPORTER_OTLP_ENDPOINT: server.url.toString(),
            OTEL_TRACES_EXPORTER: "otlp",
          }),
        ),
      ),
      { middleware: httpServerMetrics },
    );

    try {
      const response = await boundary.handler(
        new Request(
          "http://localhost/trace/123?code=oauth-secret&state=state-secret",
          {
            headers: {
              "x-custom-secret": "request-secret",
              traceparent:
                "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
            },
          },
        ),
      );

      expect(response.status).toBe(204);
      await new Promise<void>((resolve) => setImmediate(resolve));
    } finally {
      await boundary.dispose();
      await server.stop(true);
    }

    const entry = decodeLog(logOutput.mock.calls[0]?.[0]);
    expect(entry.trace_id).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const exported = JSON.stringify(payloads);
    const logs = JSON.stringify(logOutput.mock.calls);

    for (const secret of [
      "oauth-secret",
      "state-secret",
      "request-secret",
      "response-secret",
      "initial-secret",
      "late-secret",
    ]) {
      expect(exported).not.toContain(secret);
      expect(logs).not.toContain(secret);
    }

    expect(exported).toContain('"adapter.operation"');
    expect(exported).toContain('"http.request.method"');
    expect(exported).toContain('"http.response.status_code"');
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceSpans: [
            expect.objectContaining({
              scopeSpans: [
                expect.objectContaining({
                  spans: expect.arrayContaining([
                    expect.objectContaining({
                      traceId: entry.trace_id,
                      spanId: entry.span_id,
                      parentSpanId: "bbbbbbbbbbbbbbbb",
                      attributes: expect.arrayContaining([
                        attribute("http.route", "/trace/:id"),
                      ]),
                    }),
                  ]),
                }),
              ],
            }),
          ],
        }),
      ]),
    );
  });
  test("samples roots at 10% and inherits sampled and unsampled parents", async () => {
    const payloads: unknown[] = [];

    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        payloads.push(await request.json());

        return Response.json({});
      },
    });

    const random = spyOn(Math, "random").mockReturnValue(0.5);

    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          random.mockReturnValueOnce(0.099);
          yield* Effect.void.pipe(
            Effect.withSpan("sampled-child"),
            Effect.withSpan("sampled-root"),
          );
          yield* Effect.void.pipe(
            Effect.withSpan("dropped-child"),
            Effect.withSpan("dropped-root"),
          );
          yield* Effect.void.pipe(
            Effect.withSpan("parent-sampled"),
            Effect.withParentSpan(
              Tracer.externalSpan({
                traceId: "cccccccccccccccccccccccccccccccc",
                spanId: "dddddddddddddddd",
                sampled: true,
              }),
            ),
          );
          random.mockReturnValue(0);
          yield* Effect.void.pipe(
            Effect.withSpan("parent-unsampled"),
            Effect.withParentSpan(
              Tracer.externalSpan({
                traceId: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                spanId: "ffffffffffffffff",
                sampled: false,
              }),
            ),
          );
          yield* (yield* OtlpExporter.Flusher).flush;
        }).pipe(
          Effect.provide(
            observability({
              OTEL_EXPORTER_OTLP_ENDPOINT: server.url.toString(),
              OTEL_TRACES_EXPORTER: "otlp",
            }),
          ),
        ),
      );
      const serialized = JSON.stringify(payloads);

      for (const name of ["sampled-child", "sampled-root", "parent-sampled"])
        expect(serialized).toContain(`"name":"${name}"`);

      for (const name of ["dropped-child", "dropped-root", "parent-unsampled"])
        expect(serialized).not.toContain(`"name":"${name}"`);
    } finally {
      random.mockRestore();
      await server.stop(true);
    }
  });
});
