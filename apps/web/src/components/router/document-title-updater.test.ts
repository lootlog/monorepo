import {
  QueryClient,
  QueryObserver,
  type QueryCacheNotifyEvent,
} from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { shouldRefreshDocumentTitleFromQueryCacheEvent } from "./document-title-cache-event";

describe("shouldRefreshDocumentTitleFromQueryCacheEvent", () => {
  it("refreshes only for updates to the watched query and ignores observer events", () => {
    const queryClient = new QueryClient();
    const events: QueryCacheNotifyEvent[] = [];

    const unsubscribe = queryClient
      .getQueryCache()
      .subscribe((event) => events.push(event));

    const queryKey = ["/battles/battle-1"];
    const queryKeyHash = JSON.stringify(queryKey);
    queryClient.setQueryData(queryKey, { id: "battle-1" });
    queryClient.setQueryData(["/battles/battle-2"], { id: "battle-2" });

    const observer = new QueryObserver(queryClient, {
      queryKey,
      enabled: false,
    });

    const unsubscribeObserver = observer.subscribe(() => {});
    unsubscribeObserver();
    unsubscribe();

    expect(events.some((event) => event.type === "observerAdded")).toBe(true);

    const refreshEvents = events.filter((event) =>
      shouldRefreshDocumentTitleFromQueryCacheEvent(event, queryKeyHash),
    );

    expect(refreshEvents).toHaveLength(1);
    expect(refreshEvents[0]?.query.queryKey).toEqual(queryKey);
    expect(refreshEvents[0]?.type).toBe("updated");
    queryClient.clear();
  });
});
