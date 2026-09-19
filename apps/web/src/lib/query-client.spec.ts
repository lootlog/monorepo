import { MutationObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { queryClient, shouldRetryQuery } from "./query-client";

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

describe("mutation defaults", () => {
  it("does not re-send a write whose response was lost", async () => {
    const createRecord = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const observer = new MutationObserver(queryClient, {
      mutationFn: createRecord,
    });

    await expect(observer.mutate()).rejects.toThrow("Failed to fetch");
    expect(createRecord).toHaveBeenCalledTimes(1);

    queryClient.getMutationCache().clear();
  });
});
