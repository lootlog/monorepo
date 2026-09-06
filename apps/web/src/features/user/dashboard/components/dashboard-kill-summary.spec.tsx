// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeContext } from "@/contexts/theme-context";
import { afterEach, expect, it, vi } from "vitest";
import "@/i18n/config";
import { DashboardKillSummary } from "./dashboard-kill-summary";
const stats = vi.hoisted(() => vi.fn());
vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  useKillsControllerGetUserKillStats: stats,
}));
afterEach(cleanup);
it("filters lifetime totals by world and carries the selection to statistics", async () => {
  stats.mockImplementation((params) => ({
    data: {
      overview: {
        totalKills: params?.world === "pandora" ? 12 : 42,
        killsByType: { ELITE2: 40, HERO: 2 },
        killsByWorld: { pandora: 12, zorza: 30 },
      },
    },
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }));
  const root = createRootRoute();
  const route = createRoute({
    getParentRoute: () => root,
    path: "/@me",
    component: DashboardKillSummary,
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/@me"] }),
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeContext.Provider
        value={{
          theme: "default",
          resolvedTheme: "default",
          setTheme: vi.fn(),
          isLoading: false,
        }}
      >
        <RouterProvider router={router} />
      </ThemeContext.Provider>
    </QueryClientProvider>,
  );
  await screen.findByText("42");
  expect(stats.mock.calls[0]?.[0]).toBeUndefined();
  expect(screen.getByText("42")).toBeTruthy();
  expect(screen.getByText("40")).toBeTruthy();
  expect(screen.getAllByText("0")).toHaveLength(2);
  fireEvent.click(screen.getByRole("combobox", { name: "Świat" }));
  fireEvent.click(await screen.findByRole("option", { name: "Pandora" }));
  await screen.findByText("12");
  expect(stats).toHaveBeenCalledWith(
    { world: "pandora" },
    expect.objectContaining({
      query: expect.objectContaining({ enabled: true }),
    }),
  );
  expect(
    screen.getByRole("link", { name: /^Statystyki$/ }).getAttribute("href"),
  ).toContain("world=pandora");
  fireEvent.click(screen.getByRole("combobox", { name: "Świat" }));
  fireEvent.click(
    await screen.findByRole("option", { name: "Wszystkie światy" }),
  );
  await screen.findByText("42");
  expect(
    screen.getByRole("link", { name: /^Statystyki$/ }).getAttribute("href"),
  ).not.toContain("world=");
});
