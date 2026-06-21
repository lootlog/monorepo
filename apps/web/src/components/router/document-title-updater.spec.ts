import type { QueryCacheNotifyEvent } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { shouldRefreshDocumentTitleFromQueryCacheEvent } from "./document-title-updater";

const createQueryCacheEvent = (
  type: QueryCacheNotifyEvent["type"],
  queryKey: readonly unknown[],
): QueryCacheNotifyEvent =>
  ({
    type,
    query: {
      queryKey,
    },
  }) as QueryCacheNotifyEvent;

describe("shouldRefreshDocumentTitleFromQueryCacheEvent", () => {
  it("refreshes title only when the watched query is updated", () => {
    const queryKey = ["/battles/battle-1"] as const;
    const queryKeyHash = JSON.stringify(queryKey);

    expect(
      shouldRefreshDocumentTitleFromQueryCacheEvent(
        createQueryCacheEvent("updated", queryKey),
        queryKeyHash,
      ),
    ).toBe(true);
    expect(
      shouldRefreshDocumentTitleFromQueryCacheEvent(
        createQueryCacheEvent("updated", ["/battles/battle-2"]),
        queryKeyHash,
      ),
    ).toBe(false);
  });

  it("ignores observer lifecycle events for the watched query", () => {
    const queryKey = ["/battles/battle-1"] as const;
    const queryKeyHash = JSON.stringify(queryKey);

    expect(
      shouldRefreshDocumentTitleFromQueryCacheEvent(
        createQueryCacheEvent("observerAdded", queryKey),
        queryKeyHash,
      ),
    ).toBe(false);
    expect(
      shouldRefreshDocumentTitleFromQueryCacheEvent(
        createQueryCacheEvent("observerResultsUpdated", queryKey),
        queryKeyHash,
      ),
    ).toBe(false);
  });
});
