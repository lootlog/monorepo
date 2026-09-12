export type TimersAsyncInput = {
  hasResponse: boolean;
  error: unknown;
  isFetching: boolean;
  isLoading: boolean;
};

export type TimersAsyncState = {
  /** No list yet and the first request is in flight. */
  initialLoading: boolean;
  /** No list yet and the request failed; the surface shows a retry. */
  initialError: unknown;
  /** A list is shown and a refresh is in flight. */
  refreshing: boolean;
  /** A list is shown and the latest refresh failed. */
  refreshError: boolean;
};

export const resolveTimersAsyncState = ({
  hasResponse,
  error,
  isFetching,
  isLoading,
}: TimersAsyncInput): TimersAsyncState => ({
  initialLoading: isLoading && !hasResponse,
  initialError: hasResponse ? null : error,
  refreshing: isFetching && hasResponse,
  refreshError: Boolean(error) && hasResponse,
});
