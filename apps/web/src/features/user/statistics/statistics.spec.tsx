// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import "@/i18n/config";
import { ThemeContext } from "@/contexts/theme-context";
import { Statistics } from "./statistics";
import { parseStatisticsSearch } from "./statistics-search";
const analytics = vi.hoisted(() => vi.fn());
vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  useKillsControllerGetUserKillAnalytics: analytics,
  useKillsControllerGetUserKillStats: () => ({
    data: { overview: { killsByWorld: { pandora: 5 } } },
  }),
}));
afterEach(cleanup);
function renderStatistics(url: string) {
  const root = createRootRoute();
  const auth = createRoute({
    getParentRoute: () => root,
    id: "_authenticated",
  });
  const route = createRoute({
    getParentRoute: () => auth,
    path: "@me/statistics",
    validateSearch: parseStatisticsSearch,
    component: Statistics,
  });
  const router = createRouter({
    routeTree: root.addChildren([auth.addChildren([route])]),
    history: createMemoryHistory({
      initialEntries: [url],
    }),
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
  return router;
}

it("restores URL filters, keeps them while changing tabs, and fetches the selected period", async () => {
  analytics.mockReturnValue({
    isPending: true,
    isError: false,
    isFetching: true,
    data: undefined,
    refetch: vi.fn(),
  });
  const router = renderStatistics(
    "/@me/statistics?tab=activity&days=90&world=pandora",
  );
  await screen.findByRole("heading", { level: 1, name: "Statystyki" });
  expect(analytics.mock.lastCall?.[0]).toEqual({
    days: "90",
    world: "pandora",
  });
  expect(
    screen
      .getByRole("link", { name: "Aktywność" })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(
    screen.getByRole("link", { name: "Przegląd" }).getAttribute("aria-current"),
  ).toBeNull();
  fireEvent.click(screen.getByRole("link", { name: "Potwory" }));
  await waitFor(() =>
    expect(router.state.location.search).toEqual({
      tab: "monsters",
      days: 90,
      world: "pandora",
    }),
  );
  expect(
    screen.getByRole("link", { name: "Potwory" }).getAttribute("aria-current"),
  ).toBe("page");
  expect(
    screen
      .getByRole("link", { name: "Aktywność" })
      .getAttribute("aria-current"),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText("Okres"), { target: { value: "7" } });
  await waitFor(() =>
    expect(analytics.mock.lastCall?.[0]).toEqual({
      days: "7",
      world: "pandora",
    }),
  );
});

it("does not present unavailable dated history as zero kills", async () => {
  analytics.mockReturnValue({
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    data: {
      meta: { coverage: "unavailable", firstBucketAt: null },
      overview: { totalKills: 0 },
    },
  });
  renderStatistics("/@me/statistics");
  await screen.findByRole("heading", { level: 1, name: "Statystyki" });
  expect(screen.getByText(/Historia godzinowa nie obejmuje/)).toBeTruthy();
  expect(
    screen.queryByText("Brak zarejestrowanych bić w tym okresie."),
  ).toBeNull();
  expect(
    screen.queryByRole("heading", { level: 2, name: "Przegląd" }),
  ).toBeNull();
});
