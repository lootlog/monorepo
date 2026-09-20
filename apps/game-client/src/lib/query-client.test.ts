import { QueryObserver } from "@tanstack/react-query";
import { ApiError } from "@lootlog/client/transport";
import { describe, expect, it, vi } from "vitest";
import { queryClient } from "./query-client";

const apiError = (status: number) =>
  new ApiError({
    message: `HTTP ${status}`,
    method: "GET",
    status,
    url: "https://api.lootlog.test/resource",
  });

const observeOnce = async (
  queryKey: readonly unknown[],
  queryFn: () => Promise<never>,
) => {
  // Only the retry decision is under test; the backoff would add seconds.
  const observer = new QueryObserver(queryClient, {
    queryKey,
    queryFn,
    retryDelay: 0,
  });

  const unsubscribe = observer.subscribe(() => {});

  await expect(observer.refetch()).resolves.toMatchObject({
    status: "error",
  });

  unsubscribe();
  queryClient.removeQueries({ queryKey });
};

describe("game client query defaults", () => {
  it("asks the API once when the session is no longer valid", async () => {
    const read = vi.fn(async () => {
      throw apiError(401);
    });

    await observeOnce(["expired-session"], read);

    expect(read).toHaveBeenCalledTimes(1);
  });

  it("keeps retrying a temporarily unavailable service", async () => {
    const read = vi.fn(async () => {
      throw apiError(503);
    });

    await observeOnce(["service-unavailable"], read);

    expect(read).toHaveBeenCalledTimes(3);
  });
});
