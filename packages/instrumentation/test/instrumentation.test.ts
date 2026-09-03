import { describe, expect, test } from "bun:test";
import { Effect, Metric } from "effect";
import {
  httpServerDuration,
  httpServerRequestCount,
  recordHttpServerMetrics,
} from "../src/instrumentation.js";

describe("HTTP server metrics", () => {
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
