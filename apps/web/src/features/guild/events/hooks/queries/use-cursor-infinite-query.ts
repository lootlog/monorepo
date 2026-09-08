import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";

type CursorPage = {
  nextCursor: string | null;
};

type UseCursorInfiniteQueryOptions<TPage extends CursorPage> = {
  enabled: boolean;
  fetchPage: (cursor: string | undefined) => Promise<TPage>;
  queryKey: QueryKey;
};

export function useCursorInfiniteQuery<TPage extends CursorPage>({
  enabled,
  fetchPage,
  queryKey,
}: UseCursorInfiniteQueryOptions<TPage>) {
  return useInfiniteQuery<
    TPage,
    Error,
    InfiniteData<TPage>,
    QueryKey,
    string | undefined
  >({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    enabled,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
