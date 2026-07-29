import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";

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
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchPage(typeof pageParam === "string" ? pageParam : undefined),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
