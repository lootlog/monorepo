import { vi } from "vitest";
import type { EventHistoryQuery } from "./event-history-results";

export function createHistoryQuery(
  overrides: Partial<EventHistoryQuery> = {},
): EventHistoryQuery {
  return {
    isLoading: false,
    isError: false,
    isFetching: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  };
}
