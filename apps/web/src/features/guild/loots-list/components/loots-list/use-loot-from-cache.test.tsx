// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
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
import { lootListQueryKey, patchLoot } from "./loot-list-cache";
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

const renderCachedLoot = (client: QueryClient) => {
  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "$guildId/loots",
    component: function CachedLoot() {
      const cachedLoot = useLootFromCache(1);

      return (
        <output>
          {cachedLoot?.mapPlayersSnapshot?.map((player) => player.name)}:
          {cachedLoot?.likes.length}
        </output>
      );
    },
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/guild-1/loots"] }),
  });

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

const createCachedClient = () => {
  const client = new QueryClient();
  client.setQueryData(lootListQueryKey("guild-1", { world: "tempest" }), {
    pages: [{ items: [loot], nextCursor: null }],
    pageParams: [""],
  });

  return client;
};

it("returns the full loot, snapshot included, from a cached loot list", async () => {
  const client = createCachedClient();

  try {
    renderCachedLoot(client);
    expect((await screen.findByRole("status")).textContent).toBe(
      "Obserwator:0",
    );
  } finally {
    cleanup();
    client.clear();
  }
});

it("shows a like written to the cached loot list after it was first read", async () => {
  const client = createCachedClient();

  try {
    renderCachedLoot(client);
    await screen.findByRole("status");

    act(() =>
      patchLoot(client, "guild-1", 1, {
        likes: [{ id: 0, name: "Obserwator", avatar: null, userId: "user-1" }],
      }),
    );

    expect(screen.getByRole("status").textContent).toBe("Obserwator:1");
  } finally {
    cleanup();
    client.clear();
  }
});
