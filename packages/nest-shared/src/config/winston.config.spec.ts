import { afterEach, describe, expect, it, vi } from "vitest";
import * as winston from "winston";
import { trace, TraceFlags, type Span } from "@opentelemetry/api";
import { createWinstonConfig } from "./winston.config.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("createWinstonConfig", () => {
  it("uses readable console logging locally", () => {
    process.env.ENV = "local";

    const config = createWinstonConfig({ serviceName: "api" });

    expect(config.level).toBe("debug");
    expect(config.transports).toHaveLength(1);
    expect(config.transports?.[0]).toBeInstanceOf(winston.transports.Console);
  });

  it("emits structured JSON with stable metadata outside local", () => {
    process.env.ENV = "prod";
    process.env.COMMIT_SHA = "1234567890";

    const config = createWinstonConfig({ serviceName: "api" });
    const info = config.format?.transform({
      level: "info",
      message: "request completed",
    });

    expect(config.level).toBe("info");
    expect(config.defaultMeta).toEqual({
      service: "api",
      environment: "prod",
      commit: "1234567",
    });
    expect(info).toMatchObject({
      level: "info",
      message: "request completed",
      timestamp: expect.any(String),
      trace_id: null,
      span_id: null,
    });
  });

  it("adds the active OpenTelemetry trace and span identifiers", () => {
    process.env.ENV = "prod";
    vi.spyOn(trace, "getSpan").mockReturnValue({
      spanContext: () => ({
        traceId: "0123456789abcdef0123456789abcdef",
        spanId: "0123456789abcdef",
        traceFlags: TraceFlags.SAMPLED,
      }),
    } as Span);

    const config = createWinstonConfig({ serviceName: "api" });
    const info = config.format?.transform({ level: "info", message: "done" });

    expect(info).toMatchObject({
      trace_id: "0123456789abcdef0123456789abcdef",
      span_id: "0123456789abcdef",
    });
  });
});
