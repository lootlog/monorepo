// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { getEventsRankingControllerGetEventKillHistoryQueryKey } from "@lootlog/client/main";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import { useEventKillHistory } from "./use-event-kill-history";

afterEach(cleanup);

describe("useEventKillHistory", () => {
  it("aborts a pending next page when the hero filter changes and loads the new history", async () => {
    const scope = { guildId: "guild-1", eventId: "event-1" };
    const firstPage = { data: [], nextCursor: "next-page" };
    const selectedHeroPage = { data: [], nextCursor: null };
    const requests: URL[] = [];
    const abortedRequests: URL[] = [];

    onTestFinished(
      configureApiClients({
        main: {
          baseUrl: "https://api.test",
          fetch: async (input, options) => {
            const url = new URL(
              input instanceof Request ? input.url : input.toString(),
            );

            requests.push(url);

            if (url.searchParams.has("cursor")) {
              return new Promise<Response>((_resolve, reject) => {
                options?.signal?.addEventListener(
                  "abort",
                  () => {
                    abortedRequests.push(url);
                    reject(new DOMException("Aborted", "AbortError"));
                  },
                  { once: true },
                );
              });
            }

            return Response.json(
              url.searchParams.has("heroId") ? selectedHeroPage : firstPage,
            );
          },
        },
      }),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    onTestFinished(() => client.clear());

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const initialProps: Parameters<typeof useEventKillHistory>[0] = scope;

    const { result, rerender } = renderHook(useEventKillHistory, {
      initialProps,
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      void result.current.fetchNextPage();
    });
    await waitFor(() => expect(requests).toHaveLength(2));

    rerender({ ...scope, heroId: "hero-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      abortedRequests.map((url) => url.searchParams.get("cursor")),
    ).toEqual(["next-page"]);
    expect(requests[requests.length - 1]?.searchParams.get("heroId")).toBe(
      "hero-2",
    );
    expect(result.current.data?.pages).toEqual([selectedHeroPage]);
    expect(result.current.isError).toBe(false);
    expect(
      client.getQueryData(
        getEventsRankingControllerGetEventKillHistoryQueryKey(scope, {
          limit: "20",
        }),
      ),
    ).toEqual({ pages: [firstPage], pageParams: [undefined] });
  });
});
