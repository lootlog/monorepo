import { CancelledError } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { withRouteLoaderCancellation } from "./route-errors";

describe("withRouteLoaderCancellation", () => {
  it("returns the loader result when the loader succeeds", async () => {
    await expect(
      withRouteLoaderCancellation(async () => {
        return "ok";
      }),
    ).resolves.toBe("ok");
  });

  it("returns undefined for cancelled route loaders", async () => {
    await expect(
      withRouteLoaderCancellation(async () => {
        throw new CancelledError();
      }),
    ).resolves.toBeUndefined();
  });

  it("rethrows non-cancelled errors", async () => {
    const error = new Error("boom");

    await expect(
      withRouteLoaderCancellation(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });
});
