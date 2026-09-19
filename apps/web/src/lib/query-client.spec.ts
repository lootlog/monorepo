import { describe, expect, it } from "vitest";
import { shouldRetryQuery } from "./query-client";

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status });

describe("shouldRetryQuery", () => {
  it("does not retry an answer the server will repeat", () => {
    expect(shouldRetryQuery(0, httpError(403))).toBe(false);
    expect(shouldRetryQuery(0, httpError(404))).toBe(false);
  });

  it("retries transient failures up to the limit", () => {
    expect(shouldRetryQuery(0, httpError(503))).toBe(true);
    expect(shouldRetryQuery(1, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetryQuery(0, httpError(429))).toBe(true);
    expect(shouldRetryQuery(2, httpError(503))).toBe(false);
  });
});
