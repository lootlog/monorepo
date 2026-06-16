import { CancelledError } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { withRouteLoaderCancellation } from "./route-errors";

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

  it("rethrows cancelled route loader errors when the route is not aborted", async () => {
    const abortController = new AbortController();
    const error = new CancelledError();

    await expect(
      withRouteLoaderCancellation(abortController, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
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
