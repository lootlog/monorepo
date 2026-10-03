import { CancelledError } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
  rethrowNotFoundOrError,
  withRouteLoaderCancellation,
} from "./route-errors";

describe("withRouteLoaderCancellation", () => {
  it("returns the loader result when the loader succeeds", async () => {
    const abortController = new AbortController();

    await expect(
      withRouteLoaderCancellation(abortController, async () => {
        return "ok";
      }),
    ).resolves.toBe("ok");
  });

  it("throws AbortError for cancelled route loaders when the route is aborted", async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      withRouteLoaderCancellation(abortController, async () => {
        throw new CancelledError();
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("loads again when a query is cancelled while the route is still active", async () => {
    const abortController = new AbortController();

    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new CancelledError({ revert: true }))
      .mockResolvedValueOnce("ok");

    await expect(
      withRouteLoaderCancellation(abortController, loader),
    ).resolves.toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("rethrows the cancellation when every attempt is cancelled", async () => {
    const abortController = new AbortController();
    const error = new CancelledError();

    const loader = vi.fn(async () => {
      throw error;
    });

    await expect(
      withRouteLoaderCancellation(abortController, loader),
    ).rejects.toBe(error);
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it("rethrows non-cancelled errors", async () => {
    const abortController = new AbortController();
    const error = new Error("boom");

    await expect(
      withRouteLoaderCancellation(abortController, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });
});

describe("rethrowNotFoundOrError", () => {
  it("turns 404 API errors into route not found errors", () => {
    expect(() => rethrowNotFoundOrError({ status: 404 })).toThrow(
      expect.objectContaining({ isNotFound: true }),
    );
  });

  it("rethrows non-404 errors", () => {
    const error = new Error("boom");

    expect(() => rethrowNotFoundOrError(error)).toThrow(error);
  });
});
