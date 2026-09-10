import { configureApiClients } from "@lootlog/client/transport";
import type { BattlesListResponseDtoOutput } from "@lootlog/client/battlelog";
import { createBattle, createBattleWarrior } from "@/lib/testing/battle";
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, expect, it, onTestFinished } from "vitest";
import "@/i18n/config";
import { DashboardRecentBattles } from "./dashboard-recent-battles";

afterEach(cleanup);

function renderCard(battles: BattlesListResponseDtoOutput["battles"]) {
  const requests: URL[] = [];
  onTestFinished(
    configureApiClients({
      battlelog: {
        baseUrl: "https://battlelog.test",
        fetch: async (input) => {
          requests.push(
            new URL(input instanceof Request ? input.url : input.toString()),
          );

          const response: BattlesListResponseDtoOutput = {
            battles,
            pagination: { size: 5, hasNext: false, hasPrev: false },
            meta: { performance: { queryTime: 0 } },
          };

          return Response.json(response);
        },
      },
    }),
  );
  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "/@me",
    component: DashboardRecentBattles,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/@me"] }),
  });

  const queryClient = new QueryClient();
  onTestFinished(() => queryClient.clear());
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return requests;
}

it("shows opponent levels, world and the player-relative outcome with a battle detail link", async () => {
  const requests = renderCard([
    createBattle({
      id: "recent-1",
      characterId: "player",
      hasFlee: false,
      winningTeam: 2,
      world: "Luvia",
      createdAt: new Date().toISOString(),
      warriors: [
        createBattleWarrior({
          originalId: "player",
          name: "Wild",
          lvl: 100,
          team: 2,
        }),
        createBattleWarrior({
          originalId: "enemy",
          name: "Rywal",
          lvl: 110,
          team: 1,
        }),
      ],
    }),
  ]);

  const opponent = await screen.findByText("Rywal (110)");
  expect(opponent.closest("a")?.getAttribute("href")).toBe(
    "/@me/battle-panel/battles/recent-1",
  );
  expect(screen.getByRole("img", { name: "Wygrana" })).toBeTruthy();
  expect(screen.getByText(/Luvia/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Usuń" }));
  expect(await screen.findByRole("alertdialog")).toBeTruthy();

  expect(requests[0]?.searchParams.get("size")).toBe("5");
  expect(requests[0]?.searchParams.get("sortOrder")).toBe("desc");
  expect(requests[0]?.searchParams.get("includeTotal")).toBe("false");
});

it("shows an empty state and keeps the panel link available", async () => {
  renderCard([]);
  expect(
    await screen.findByText("Nie masz jeszcze zapisanych walk."),
  ).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Pokaż wszystkie" }).getAttribute("href"),
  ).toBe("/@me/battle-panel");
});
