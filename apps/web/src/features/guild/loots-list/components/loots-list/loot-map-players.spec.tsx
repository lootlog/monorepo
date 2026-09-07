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
import { useLootFromCache } from "@/hooks/use-loot-from-cache";
import { afterEach, describe, expect, it } from "vitest";
import "@/i18n/config";
import type { Loot } from "@/lib/loots/loot-types";
import { LootMapPlayers } from "./loot-map-players";

afterEach(cleanup);

const loot = {
  source: "FIGHT",
  players: [{ characterId: 4 }],
  items: [{ rarity: "LEGENDARY" }],
  npcs: [{ wt: 20, type: "ELITE2" }],
  mapPlayersSnapshot: [
    {
      accountId: 1,
      characterId: 2,
      name: "Obserwator",
      prof: "WARRIOR",
      icon: "warrior.gif",
    },
    { accountId: 3, characterId: 4, name: "Uczestnik", prof: null, icon: null },
  ],
} satisfies Pick<Loot, "source" | "mapPlayersSnapshot"> & {
  players: Pick<Loot["players"][number], "characterId">[];
  items: Pick<Loot["items"][number], "rarity">[];
  npcs: Pick<Loot["npcs"][number], "wt" | "type">[];
};

describe("LootMapPlayers", () => {
  it("shows the recorded players and professions separately from fight participants", () => {
    render(<LootMapPlayers loot={loot} />);
    expect(
      screen.getByRole("heading", {
        name: "Gracze na mapie w chwili dropu (2)",
      }),
    ).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Obserwator")).toBeTruthy();
    expect(screen.getByText("Wojownik")).toBeTruthy();
    expect(screen.getByText("Uczestnik")).toBeTruthy();
    expect(screen.getAllByText("W party")).toHaveLength(1);
    expect(screen.getByText("W party").closest("li")).toBe(
      screen.getByText("Uczestnik").closest("li"),
    );
  });

  it("does not infer party membership from names or missing character IDs", () => {
    render(
      <LootMapPlayers
        loot={{
          ...loot,
          players: [{ characterId: null }],
          mapPlayersSnapshot: loot.mapPlayersSnapshot.map((player) => ({
            ...player,
            name: "Uczestnik",
          })),
        }}
      />,
    );
    expect(screen.queryByText("W party")).toBeNull();
  });

  it("does not label recipients of non-fight loot as party participants", () => {
    render(<LootMapPlayers loot={{ ...loot, source: "LOOTBOX" }} />);
    expect(screen.queryByText("W party")).toBeNull();
  });

  it.each([null, "HERO", "ELITE"] as const)(
    "shows a captured roster despite a legacy NPC type of %s",
    (type) => {
      render(<LootMapPlayers loot={{ ...loot, npcs: [{ wt: 20, type }] }} />);
      expect(
        screen.getByRole("heading", {
          name: "Gracze na mapie w chwili dropu (2)",
        }),
      ).toBeTruthy();
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(screen.getByText("Obserwator")).toBeTruthy();
    },
  );

  it("distinguishes an unavailable snapshot from an empty map", () => {
    render(<LootMapPlayers loot={{ ...loot, mapPlayersSnapshot: null }} />);
    expect(screen.getByText("Brak danych o graczach na mapie")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("heading").textContent).not.toContain("(0)");
  });

  it.each([
    { ...loot, source: "LOOTBOX" as const },
    { ...loot, items: [{ rarity: "HEROIC" as const }] },
    { ...loot, npcs: [{ wt: 20, type: "HERO" as const }] },
    {
      ...loot,
      npcs: [
        { wt: 20, type: "ELITE2" as const },
        { wt: 100, type: "HERO" as const },
      ],
    },
  ])(
    "hides the section for nonqualifying loot without a snapshot",
    (otherLoot) => {
      const { container } = render(
        <LootMapPlayers loot={{ ...otherLoot, mapPlayersSnapshot: null }} />,
      );
      expect(container.textContent).toBe("");
    },
  );
});

it.each([
  { page: [{ ...loot, id: 1 }] },
  { page: { data: [{ ...loot, id: 1 }] } },
])("shows the recorded snapshot from a cached list page", async ({ page }) => {
  const client = new QueryClient();
  client.setQueryData(["/guilds/guild-1/loots"], {
    pages: [page],
    pageParams: [null],
  });
  const root = createRootRoute();
  const route = createRoute({
    getParentRoute: () => root,
    path: "$guildId/loots",
    component: () => {
      const cachedLoot = useLootFromCache(1);
      return cachedLoot ? <LootMapPlayers loot={cachedLoot} /> : null;
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
    expect(
      await screen.findByRole("heading", {
        name: "Gracze na mapie w chwili dropu (2)",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Obserwator")).toBeTruthy();
  } finally {
    cleanup();
    client.clear();
  }
});
