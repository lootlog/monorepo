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
import { afterEach, expect, it, vi } from "vitest";
import "@/i18n/config";
import { DashboardRecentBattles } from "./dashboard-recent-battles";
const stats = vi.hoisted(() => vi.fn());
vi.mock("@lootlog/client/battlelog", async () => ({
  ...(await vi.importActual("@lootlog/client/battlelog")),
  useBattlesControllerGetDashboardBattles: stats,
}));
afterEach(cleanup);
function renderCard() {
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
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
it("shows opponent levels, world and the player-relative outcome with a battle detail link", async () => {
  stats.mockReturnValue({
    data: {
      battles: [
        {
          id: "recent-1",
          characterId: "player",
          hasFlee: false,
          winningTeam: 2,
          world: "Luvia",
          createdAt: new Date().toISOString(),
          warriors: [
            { originalId: "player", name: "Wild", lvl: 100, team: 2 },
            { originalId: "enemy", name: "Rywal", lvl: 110, team: 1 },
          ],
        },
      ],
    },
    isPending: false,
    isError: false,
  });
  renderCard();
  const opponent = await screen.findByText("Rywal (110)");
  expect(opponent.closest("a")?.getAttribute("href")).toBe(
    "/@me/battle-panel/battles/recent-1",
  );
  expect(screen.getByRole("img", { name: "Wygrana" })).toBeTruthy();
  expect(screen.getByText(/Luvia/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Usuń" }));
  expect(await screen.findByRole("alertdialog")).toBeTruthy();

  expect(stats).toHaveBeenCalledWith(
    { size: 5, sortOrder: "desc", includeTotal: false },
    expect.anything(),
  );
});
it("shows an empty state and keeps the panel link available", async () => {
  stats.mockReturnValue({
    data: { battles: [] },
    isPending: false,
    isError: false,
  });
  renderCard();
  expect(
    await screen.findByText("Nie masz jeszcze zapisanych walk."),
  ).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Pokaż wszystkie" }).getAttribute("href"),
  ).toBe("/@me/battle-panel");
});
