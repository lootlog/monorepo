import { MutationObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { queryClient } from "./query-client";

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
