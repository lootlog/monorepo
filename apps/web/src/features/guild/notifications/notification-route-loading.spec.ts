import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { configureApiClients } from "@lootlog/client/transport";
import { afterEach, expect, it, vi } from "vitest";
import { Route as HistoryRoute } from "../../../routes/_authenticated/$guildId/notifications/history";
import { Route as CreateRoute } from "../../../routes/_authenticated/$guildId/notifications/create";
import { Route as EditRoute } from "../../../routes/_authenticated/$guildId/notifications/$ruleId";
import type { RouterContext } from "@/App";

afterEach(() => vi.unstubAllGlobals());

it.each([
  {
    name: "history",
    loader: HistoryRoute.options.loader,
    endpoints: ["/guilds/42/notifications/jobs"],
  },
  {
    name: "create",
    loader: CreateRoute.options.loader,
    endpoints: [
      "/guilds/42/notifications/targets",
      "/guilds/42/notifications/rules",
      "/guilds/42/worlds",
      "/guilds/42/roles",
    ],
  },
  {
    name: "edit",
    loader: EditRoute.options.loader,
    endpoints: [
      "/guilds/42/notifications/targets",
      "/guilds/42/notifications/rules",
      "/guilds/42/worlds",
      "/guilds/42/roles",
    ],
  },
])(
  "loads only datasets used by the $name page",
  async ({ loader, endpoints }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const restore = configureApiClients({
      main: { baseUrl: "https://api.test" },
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
      const root = createRootRouteWithContext<RouterContext>()({});
      const route = createRoute({
        getParentRoute: () => root,
        path: "/$guildId/$ruleId",
        loader: (context) => {
          if (typeof loader !== "function")
            throw new Error("Expected notifications loader");
          // This isolated route supplies both IDs and the shared query context.
          const isolatedLoader = loader as (input: {
            abortController: AbortController;
            context: { queryClient: QueryClient };
            params: { guildId: string; ruleId: string };
          }) => Promise<unknown> | void;
          return isolatedLoader(context);
        },
      });
      const router = createRouter({
        routeTree: root.addChildren([route]),
        context: { queryClient },
        history: createMemoryHistory({ initialEntries: ["/"] }),
      });
      await router.navigate({ href: "/42/rule" });
      expect(requests.sort()).toEqual(endpoints.sort());
    } finally {
      queryClient.clear();
      restore();
    }
  },
);
