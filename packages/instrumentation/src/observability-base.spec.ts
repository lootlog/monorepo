import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createObservabilityComponents,
  createHttpServerMetricViews,
  shouldSkipObservability,
} from "./observability-base.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("createObservabilityComponents", () => {
  it("uses OTEL_SERVICE_INSTANCE_ID before the pod hostname", async () => {
    vi.stubEnv("OTEL_SERVICE_INSTANCE_ID", "explicit-instance");
    vi.stubEnv("HOSTNAME", "gateway-abc123");

    const components = createObservabilityComponents({
      serviceName: "gateway",
      serviceEnvironment: "dev",
      otlpEndpoint: "http://alloy:4318",
    });

    expect(components.resource.attributes["service.instance.id"]).toBe(
      "explicit-instance",
    );

    await components.spanProcessor.shutdown();
    await components.metricReader.shutdown();
  });

  it("uses the pod hostname and supports an explicit config override", async () => {
    vi.stubEnv("HOSTNAME", "gateway-abc123");

    const hostnameComponents = createObservabilityComponents({
      serviceName: "gateway",
      serviceEnvironment: "dev",
      otlpEndpoint: "http://alloy:4318",
    });
    const overrideComponents = createObservabilityComponents({
      serviceName: "gateway",
      serviceInstanceId: "test-instance",
      serviceEnvironment: "dev",
      otlpEndpoint: "http://alloy:4318",
    });

    expect(hostnameComponents.resource.attributes["service.instance.id"]).toBe(
      "gateway-abc123",
    );
    expect(overrideComponents.resource.attributes["service.instance.id"]).toBe(
      "test-instance",
    );

    await hostnameComponents.spanProcessor.shutdown();
    await hostnameComponents.metricReader.shutdown();
    await overrideComponents.spanProcessor.shutdown();
    await overrideComponents.metricReader.shutdown();
  });
});

describe("createHttpServerMetricViews", () => {
  it("uses unit-appropriate latency buckets", () => {
    const views = createHttpServerMetricViews();

    expect(views[0]?.aggregation).toMatchObject({
      options: {
        boundaries: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      },
    });
    expect(views[1]?.aggregation).toMatchObject({
      options: {
        boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      },
    });
  });
});

describe("shouldSkipObservability", () => {
  it("enables remote observability without OTLP headers", () => {
    expect(
      shouldSkipObservability({
        serviceName: "api",
        serviceEnvironment: "prod",
        otlpEndpoint: "http://alloy:4318",
      }),
    ).toBe(false);
  });

  it("skips remote observability when the endpoint is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(
      shouldSkipObservability({
        serviceName: "api",
        serviceEnvironment: "prod",
      }),
    ).toBe(true);
  });
});
