// @vitest-environment happy-dom
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
import { Route } from "../../routes/_authenticated/$guildId";

afterEach(() => vi.unstubAllGlobals());

it("finishes organization navigation with an error after bounded lookup retries", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 2, retryDelay: 0 } },
  });

  const restore = configureApiClients({
    main: { baseUrl: "https://api.test" },
  });

  let organizationRequests = 0;

  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;

    if (path === "/guilds/42") {
      organizationRequests++;

      return Response.json({ message: "Unavailable" }, { status: 503 });
    }

    return Response.json(path.endsWith("/permissions") ? [] : { active: true });
  });

  const root = createRootRouteWithContext<RouterContext>()({});

  const route = createRoute({
    getParentRoute: () => root,
    path: "/$guildId",
    loader: (context) => {
      const loader = Route.options.loader;

      if (!loader || "handler" in loader)
        throw new Error("Missing organization loader");

      // SAFETY: The file route's parent type includes authentication; this loader only
      // consumes params, queryClient and abortController supplied by this router.
      return loader({
        abortController: context.abortController,
        params: context.params,
        context: {
          ...context.context,
          guildId: context.params.guildId,
          session: { data: null, error: null },
        },
      } as Parameters<typeof loader>[0]);
    },
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  try {
    void router.navigate({ href: "/42" });
    await vi.waitFor(() => {
      expect(
        router.state.matches[router.state.matches.length - 1]?.status,
      ).toBe("error");
    });
    expect(organizationRequests).toBe(3);
  } finally {
    queryClient.clear();
    restore();
  }
});
