import type { QueryCacheNotifyEvent } from "@tanstack/react-query";

export function shouldRefreshDocumentTitleFromQueryCacheEvent(
  event: QueryCacheNotifyEvent,
  queryKeyHash: string,
) {
  if (!queryKeyHash || event.type !== "updated") {
    return false;
  }

  return JSON.stringify(event.query.queryKey) === queryKeyHash;
}
