// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { getListEventKillHistoryQueryKey } from "@lootlog/client/main";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import { useEventKillHistory } from "./use-event-kill-history";
import { useEventMemberKillHistory } from "./use-event-member-kill-history";
import { createHeroKill } from "@/lib/testing/event-kill";

afterEach(cleanup);

describe("useEventKillHistory", () => {
  it("aborts a pending next page when the hero filter changes and loads the new history", async () => {
    const scope = { guildId: "guild-1", eventId: "event-1" };
    const firstPage = { kind: "event", data: [], nextCursor: "next-page" };
    const selectedHeroPage = { kind: "event", data: [], nextCursor: null };
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
        getListEventKillHistoryQueryKey(scope, {
          limit: "20",
        }),
      ),
    ).toEqual({ pages: [firstPage], pageParams: [undefined] });
  });

  it("keeps member history on a failed next page and retries the same cursor", async () => {
    const requests: URL[] = [];
    const member = { id: 1, name: "Member", userId: "user-1", avatar: null };

    const firstKill = {
      ...createHeroKill(),
      memberPoint: {
        points: 1,
        basePoints: 1,
        manualAdjustmentPoints: 0,
        bonusBreakdown: null,
        trackingDurationSeconds: 60,
        trackingDurationPercentage: 100,
      },
    };

    let failNextPage = true;
    onTestFinished(
      configureApiClients({
        main: {
          baseUrl: "https://api.test",
          fetch: async (input) => {
            const url = new URL(
              input instanceof Request ? input.url : input.toString(),
            );

            requests.push(url);
            const cursor = url.searchParams.get("cursor");

            if (cursor && failNextPage)
              return Response.json({}, { status: 503 });

            return Response.json({
              kind: "member",
              member,
              data: [
                { ...firstKill, id: cursor ? "older-kill" : "first-kill" },
              ],
              nextCursor: cursor ? null : "history-cursor",
            });
          },
        },
      }),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    onTestFinished(() => client.clear());

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useEventMemberKillHistory({
          guildId: "guild-1",
          eventId: "event-1",
          memberId: "1",
          heroId: "hero-1",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.isFetchNextPageError).toBe(true));
    expect(
      result.current.data?.pages.flatMap((page) =>
        page.data.map((kill) => kill.id),
      ),
    ).toEqual(["first-kill"]);

    failNextPage = false;
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      result.current.data?.pages.flatMap((page) =>
        page.data.map((kill) => kill.id),
      ),
    ).toEqual(["first-kill", "older-kill"]);
    expect(requests.map((url) => url.searchParams.get("cursor"))).toEqual([
      null,
      "history-cursor",
      "history-cursor",
    ]);
    expect(
      requests.every(
        (url) =>
          url.pathname === "/guilds/guild-1/events/event-1/kill-history" &&
          url.searchParams.get("memberId") === "1" &&
          url.searchParams.get("heroId") === "hero-1",
      ),
    ).toBe(true);
  });
});
