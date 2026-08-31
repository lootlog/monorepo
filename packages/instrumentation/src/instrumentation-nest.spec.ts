import { describe, expect, it } from "vitest";
import { shouldIgnoreIncomingRequest } from "./instrumentation-nest.js";

describe("shouldIgnoreIncomingRequest", () => {
  it.each([
    { url: "/healthz" },
    { url: "/healthz?probe=readiness" },
    { originalUrl: "/healthz?probe=liveness" },
    { raw: { url: "/healthz?probe=startup" } },
  ])("ignores health checks from supported request shapes", (request) => {
    expect(shouldIgnoreIncomingRequest(request)).toBe(true);
  });

  it.each([
    { url: "/guilds/123" },
    { url: "/api/healthz" },
    { url: "/healthz/details" },
  ])("keeps application requests instrumented", (request) => {
    expect(shouldIgnoreIncomingRequest(request)).toBe(false);
  });
});
