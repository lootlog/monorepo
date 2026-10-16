import { configureApiClients } from "@lootlog/client/transport";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import type { UserOnlineResponseDto } from "@lootlog/client/activity";
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
import { DashboardToday } from "./dashboard-today";

afterEach(cleanup);

const online: UserOnlineResponseDto = {
  timezone: "Europe/Warsaw",
  trackingStartedAt: null,
  lastObservedAt: null,
  status: "fresh",
  world: null,
  days: [],
};

const analyticsDefaults: UserKillAnalyticsResponseDtoOutput = {
  meta: {
    timezone: "Europe/Warsaw",
    generatedAt: "2026-09-06T12:00:00Z",
    days: 7,
    world: null,
    characterId: null,
    trackedSince: null,
    startDate: "2026-08-31",
    endDate: "2026-09-06",
    firstBucketAt: null,
    coverage: "complete",
    allTimeKills: 12,
    timedKills: 12,
    untimedKills: 0,
    includesCurrentHour: true,
  },
  overview: {
    totalKills: 12,
    activeDays: 1,
    averagePerDay: 10,
    currentStreak: 3,
    longestStreak: 5,
    uniqueNpcs: 0,
  },
  daily: [],
  weekly: [],
  hourlyWeekday: [],
  types: [],
  npcs: [],
  worlds: [],
  records: { bestDay: null, bestWeek: null, bestMonth: null },
  comparison: {
    currentKills: 12,
    previousKills: 0,
    deltaKills: 12,
    deltaPercent: null,
    currentThrough: "2026-09-06T12:00:00Z",
    previousThrough: "2026-08-30T12:00:00Z",
    partial: true,
  },
};

function renderToday({
  analytics,
  onlineResponse = online,
}: {
  /** Each call answers one request; `undefined` fails it. */
  analytics: Array<UserKillAnalyticsResponseDtoOutput | undefined>;
  onlineResponse?: UserOnlineResponseDto;
}) {
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async () => {
          const next = analytics.shift();

          return next
            ? Response.json(next)
            : Response.json({ message: "Unavailable" }, { status: 503 });
        },
      },
      activity: {
        baseUrl: "https://activity.test",
        fetch: async () => Response.json(onlineResponse),
      },
    }),
  );
  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "/@me",
    component: DashboardToday,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/@me"] }),
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  onTestFinished(() => queryClient.clear());
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const killsTile = () =>
  screen.getByText("Bicia dziś").parentElement?.textContent ?? "";

it("shows failed kill statistics as unknown with a retry, not as zero kills", async () => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
  }).format(new Date());

  renderToday({
    analytics: [
      undefined,
      {
        ...analyticsDefaults,
        daily: [{ date: today, kills: 12, partial: false, worlds: [] }],
      },
    ],
  });

  const alert = await screen.findByRole("alert");

  expect(alert.textContent).toContain("Nie udało się pobrać statystyk.");
  expect(killsTile()).not.toContain("0");

  fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

  expect(await screen.findByText("12")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("marks stale online collection instead of presenting it as current", async () => {
  renderToday({
    analytics: [],
    onlineResponse: { ...online, status: "stale" },
  });

  expect(await screen.findByText("Dane mogą być niepełne")).toBeTruthy();
});
