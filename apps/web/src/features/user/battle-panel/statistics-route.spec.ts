// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useBattlesControllerGetCombatProfile } from "@lootlog/client/battlelog";
import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { configureApiClients } from "@lootlog/client/transport";
import { afterEach, expect, it, vi } from "vitest";
import { Route } from "../../../routes/_authenticated/@me/battle-panel/statistics";
import type { RouterContext } from "@/App";

const makeRouter = (queryClient: QueryClient) => {
  const root = createRootRouteWithContext<RouterContext>()({});
  const route = createRoute({
    getParentRoute: () => root,
    path: "/statistics",
    validateSearch: (search) => ({
      characterId: String(search.characterId ?? ""),
    }),
    loader: (context) => {
      const loader = Route.options.loader;
      if (typeof loader !== "function")
        throw new Error("Expected statistics loader");
      // The isolated router supplies every context field consumed by this loader.
      const isolatedLoader = loader as (input: {
        abortController: AbortController;
        context: { queryClient: QueryClient };
        location: { searchStr: string };
        preload: boolean;
      }) => Promise<unknown>;
      return isolatedLoader(context);
    },
  });
  return createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: { queryClient },
    parseSearch: (search) => Object.fromEntries(new URLSearchParams(search)),
    stringifySearch: (search) =>
      `?${new URLSearchParams(Object.entries(search).map(([key, value]) => [key, String(value)]))}`,
  });
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("does not request analytics on navigation intent", async () => {
  const queryClient = new QueryClient();
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const router = makeRouter(queryClient);
  await router.preloadRoute({
    to: "/statistics",
    search: { characterId: "42" },
  });
  expect(fetch).not.toHaveBeenCalled();
  queryClient.clear();
});

it("finishes the route while panel data is still pending", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const restore = configureApiClients({
    battlelog: { baseUrl: "https://battlelog.test" },
  });
  const fetch = vi.fn(() => new Promise<Response>(() => {}));
  vi.stubGlobal("fetch", fetch);
  try {
    const router = makeRouter(queryClient);
    await router.navigate({ href: "/statistics?characterId=42" });
    expect(router.state.status).toBe("idle");
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(queryClient.isFetching()).toBe(6);
  } finally {
    queryClient.clear();
    restore();
  }
});

it("reuses the loader combat-profile response when its generated hook mounts", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  const restore = configureApiClients({
    battlelog: { baseUrl: "https://battlelog.test" },
  });
  const requests: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      requests.push(
        new URL(input instanceof Request ? input.url : input).pathname,
      );
      return Response.json([]);
    }),
  );
  try {
    await makeRouter(queryClient).navigate({
      href: "/statistics?characterId=42",
    });
    const { result } = renderHook(
      () =>
        useBattlesControllerGetCombatProfile({
          characterId: "42",
          period: "30d",
          minLevel: 1,
          maxLevel: 500,
          matchmaking: false,
        }),
      {
        wrapper: ({ children }: { children: ReactNode }) =>
          createElement(QueryClientProvider, { client: queryClient }, children),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      requests.filter((path) => path.endsWith("/combat-profile")),
    ).toHaveLength(1);
  } finally {
    queryClient.clear();
    restore();
  }
});
