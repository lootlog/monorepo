import { loadNotificationHistory } from "./load-notification-history";
import { loadNotificationRuleForm } from "./load-notification-rule-form";
import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { configureApiClients } from "@lootlog/client/transport";
import { afterEach, expect, it, vi } from "vitest";
import type { RouterContext } from "@/App";

afterEach(() => vi.unstubAllGlobals());

it.each([
  {
    name: "history",
    loader: loadNotificationHistory,
    endpoints: ["/guilds/42/notifications/jobs"],
  },
  {
    name: "create",
    loader: loadNotificationRuleForm,
    endpoints: [
      "/guilds/42/notifications/targets",
      "/guilds/42/notifications/rules",
      "/guilds/42/worlds",
      "/guilds/42/roles",
    ],
  },
  {
    name: "edit",
    loader: loadNotificationRuleForm,
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
        loader,
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
