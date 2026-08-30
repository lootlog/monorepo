import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldSkipObservability } from "./observability-base.js";

afterEach(() => {
  vi.restoreAllMocks();
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
