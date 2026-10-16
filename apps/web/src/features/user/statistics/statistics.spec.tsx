import { TEST_THEME_CONTEXT } from "@/lib/testing/theme-context";
import { configureApiClients } from "@lootlog/client/transport";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
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
import { afterEach, expect, it, onTestFinished } from "vitest";
import "@/i18n/config";
import { ThemeContext } from "@/contexts/theme-context";
import { Statistics } from "./statistics";
import { parseStatisticsSearch } from "./statistics-search";

afterEach(cleanup);

function renderStatistics(
  url: string,
  response?: UserKillAnalyticsResponseDtoOutput,
) {
  const requests: URL[] = [];
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: (input) => {
          const url = new URL(
            input instanceof Request ? input.url : input.toString(),
          );

          if (url.pathname.endsWith("/analytics")) {
            requests.push(url);

            return response
              ? Promise.resolve(Response.json(response))
              : new Promise<Response>(() => {});
          }

          return Promise.resolve(
            Response.json({
              overview: {
                totalKills: 5,
                killsByWorld: { luvia: 5 },
                killsByType: {},
              },
              topNpcs: [],
            }),
          );
        },
      },
    }),
  );
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

  const queryClient = new QueryClient();
  onTestFinished(() => queryClient.clear());
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={TEST_THEME_CONTEXT}>
        <RouterProvider router={router} />
      </ThemeContext.Provider>
    </QueryClientProvider>,
  );

  return { router, requests };
}

it("restores URL filters, keeps them while changing tabs, narrows only the monster ranking to the NPC type, and fetches the selected period", async () => {
  const { router, requests } = renderStatistics(
    "/@me/statistics?tab=activity&days=90&world=luvia&npcType=HERO",
  );

  await screen.findByRole("heading", { level: 1, name: "Statystyki" });
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]?.searchParams.get("days")).toBe("90");
  expect(requests[0]?.searchParams.get("world")).toBe("luvia");
  expect(requests[0]?.searchParams.has("npcType")).toBe(false);
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
      world: "luvia",
      npcType: "HERO",
    }),
  );
  await waitFor(() =>
    expect(requests[requests.length - 1]?.searchParams.get("npcType")).toBe(
      "HERO",
    ),
  );
  expect(
    screen.getByRole("link", { name: "Potwory" }).getAttribute("aria-current"),
  ).toBe("page");
  expect(
    screen
      .getByRole("link", { name: "Aktywność" })
      .getAttribute("aria-current"),
  ).toBeNull();
  // Below the results table width the filters open from a floating button.
  fireEvent.click(screen.getByRole("button", { name: /^Filtry/ }));
  fireEvent.click(await screen.findByRole("combobox", { name: "Okres" }));
  const weekOption = await screen.findByRole("option", { name: "7 dni" });
  fireEvent.pointerDown(weekOption, { pointerType: "mouse" });
  fireEvent.click(weekOption);
  await waitFor(() =>
    expect(
      requests.some(
        (request) =>
          request.searchParams.get("days") === "7" &&
          request.searchParams.get("world") === "luvia",
      ),
    ).toBe(true),
  );
});

it("does not present unavailable dated history as zero kills", async () => {
  const response: UserKillAnalyticsResponseDtoOutput = {
    meta: {
      timezone: "Europe/Warsaw",
      generatedAt: "2026-09-06T12:00:00Z",
      days: 30,
      world: null,
      startDate: "2026-08-08",
      endDate: "2026-09-06",
      firstBucketAt: null,
      coverage: "unavailable",
      allTimeKills: 0,
      timedKills: 0,
      untimedKills: 0,
      includesCurrentHour: true,
    },
    overview: {
      totalKills: 0,
      activeDays: 0,
      averagePerDay: null,
      currentStreak: 0,
      longestStreak: 0,
      uniqueNpcs: 0,
    },
    daily: [],
    weekly: [],
    hourlyWeekday: [],
    types: [],
    npcs: [],
    npcGains: [],
    worlds: [],
    records: { bestDay: null, bestWeek: null, bestMonth: null },
    comparison: {
      currentKills: 0,
      previousKills: 0,
      deltaKills: 0,
      deltaPercent: null,
      currentThrough: "2026-09-06T12:00:00Z",
      previousThrough: "2026-08-07T12:00:00Z",
      partial: true,
    },
  };

  renderStatistics("/@me/statistics", response);
  await screen.findByRole("heading", { level: 1, name: "Statystyki" });
  expect(await screen.findByText("Brak danych")).toBeTruthy();
  expect(
    screen.queryByText("Brak zarejestrowanych bić w tym okresie."),
  ).toBeNull();
  expect(
    screen.queryByRole("heading", { level: 2, name: "Przegląd" }),
  ).toBeNull();
});
