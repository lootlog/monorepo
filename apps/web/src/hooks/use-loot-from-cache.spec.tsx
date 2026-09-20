// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, expect, it } from "vitest";
import { createLoot } from "@/lib/testing/loot";
import { useLootFromCache } from "./use-loot-from-cache";

afterEach(cleanup);

const loot = {
  ...createLoot(1),
  mapPlayersSnapshot: [
    {
      accountId: 1,
      characterId: 2,
      name: "Obserwator",
      prof: "WARRIOR" as const,
      icon: null,
    },
  ],
};

it.each([{ page: [loot] }, { page: { data: [loot] } }])(
  "returns the full loot, snapshot included, from either cached page shape",
  async ({ page }) => {
    const client = new QueryClient();
    client.setQueryData(["/guilds/guild-1/loots"], {
      pages: [page],
      pageParams: [null],
    });
    const root = createRootRoute();

    const route = createRoute({
      getParentRoute: () => root,
      path: "$guildId/loots",
      component: function CachedLoot() {
        const cachedLoot = useLootFromCache(1);

        return (
          <output>
            {cachedLoot?.mapPlayersSnapshot?.map((player) => player.name)}
          </output>
        );
      },
    });

    const router = createRouter({
      routeTree: root.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/guild-1/loots"] }),
    });

    try {
      render(
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      );
      expect((await screen.findByRole("status")).textContent).toBe(
        "Obserwator",
      );
    } finally {
      cleanup();
      client.clear();
    }
  },
);
