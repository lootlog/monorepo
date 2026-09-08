import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import type { UserKillActivityResponseDtoOutput } from "@lootlog/client/main";
import type { UserOnlineResponseDto } from "@lootlog/client/activity";
// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Storage as MemoryStorage } from "happy-dom";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import "@/i18n/config";
import { DashboardActivity } from "./dashboard-activity";
const onlineDefaults: UserOnlineResponseDto = {
  timezone: "Europe/Warsaw",
  trackingStartedAt: null,
  lastObservedAt: null,
  status: "fresh",
  days: [],
};
const killsDefaults: UserKillActivityResponseDtoOutput = {
  meta: {
    timezone: "Europe/Warsaw",
    generatedAt: "2026-09-06T12:00:00Z",
    days: 112,
    world: null,
    startDate: "2026-05-18",
    endDate: "2026-09-06",
    firstBucketAt: null,
    coverage: "complete",
    allTimeKills: 0,
    timedKills: 0,
    untimedKills: 0,
    includesCurrentHour: true,
  },
  daily: [],
};
let onlineResponse: UserOnlineResponseDto | undefined;
let killsResponse: UserKillActivityResponseDtoOutput | undefined;
let onlineRequests: URL[];
let killRequests: URL[];
function renderActivity() {
  const client = new QueryClient();
  onTestFinished(() => client.clear());
  return render(
    <QueryClientProvider client={client}>
      <DashboardActivity />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  onlineResponse = undefined;
  killsResponse = undefined;
  onlineRequests = [];
  killRequests = [];
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: (input) => {
          killRequests.push(
            new URL(input instanceof Request ? input.url : input.toString()),
          );
          return killsResponse
            ? Promise.resolve(Response.json(killsResponse))
            : new Promise<Response>(() => {});
        },
      },
      activity: {
        baseUrl: "https://activity.test",
        fetch: (input) => {
          onlineRequests.push(
            new URL(input instanceof Request ? input.url : input.toString()),
          );
          return onlineResponse
            ? Promise.resolve(Response.json(onlineResponse))
            : new Promise<Response>(() => {});
        },
      },
    }),
  );
  vi.stubGlobal("localStorage", new MemoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
  vi.useRealTimers();
});
it("defaults to lightweight online and enables kills activity only on demand", async () => {
  renderActivity();
  const onlineButton = screen.getByRole("button", { name: "Online" });
  fireEvent.click(onlineButton);
  expect(onlineButton.getAttribute("aria-pressed")).toBe("true");
  await waitFor(() => expect(onlineRequests).toHaveLength(1));
  expect(killRequests).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Bicia" }));
  await waitFor(() => expect(killRequests.length).toBeGreaterThan(0));
  await waitFor(() => expect(killRequests).toHaveLength(1));
  expect(onlineRequests).toHaveLength(1);
});

it("requests 112 inclusive days and hides older cached kill activity", async () => {
  vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
  onlineResponse = { ...onlineDefaults, ...{ status: "fresh", days: [] } };
  killsResponse = {
    ...killsDefaults,
    ...{
      meta: { ...killsDefaults.meta, coverage: "complete" },
      daily: [
        { date: "2026-05-17", kills: 8, partial: false, worlds: [] },
        { date: "2026-05-18", kills: 9, partial: false, worlds: [] },
        { date: "2026-09-06", kills: 10, partial: true, worlds: [] },
      ],
    },
  };
  renderActivity();
  await waitFor(() => expect(onlineRequests).toHaveLength(1));
  expect(onlineRequests[0]?.searchParams.get("from")).toBe("2026-05-18");
  expect(onlineRequests[0]?.searchParams.get("to")).toBe("2026-09-06");
  fireEvent.click(screen.getByRole("button", { name: "Bicia" }));
  await waitFor(() => expect(killRequests.length).toBeGreaterThan(0));
  expect(screen.queryByRole("button", { name: /17 maja/ })).toBeNull();
  expect(await screen.findByRole("button", { name: /18 maja/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /6 września/ })).toBeTruthy();
});

it("uses the lowest activity level for missing days in both tabs without details or coverage notices", async () => {
  vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
  onlineResponse = {
    ...onlineDefaults,
    ...{
      status: "fresh",
      days: [
        {
          date: "2026-09-01",
          onlineSeconds: null,
          partial: false,
          worlds: [],
          worldsComplete: true,
        },
      ],
    },
  };
  killsResponse = {
    ...killsDefaults,
    ...{
      meta: { ...killsDefaults.meta, coverage: "partial" },
      daily: [{ date: "2026-09-01", kills: null, partial: false, worlds: [] }],
    },
  };
  renderActivity();
  for (const mode of ["Online", "Bicia"]) {
    fireEvent.click(screen.getByRole("button", { name: mode }));
    const day = await screen.findByRole("button", { name: /1 września/ });
    expect(day.getAttribute("aria-label")).toContain("Brak danych");
    expect(day.classList.contains("bg-muted")).toBe(true);
    fireEvent.click(day);
    expect(document.querySelector("p[aria-live=polite]")).toBeNull();
    expect(screen.queryByText("Brak danych")).toBeNull();
    expect(screen.queryByText(/Wybierz dzień/)).toBeNull();
    expect(screen.queryByText(/Historia godzinowa/)).toBeNull();
  }
});

it("passes each day's source worlds independently in both activity tabs", async () => {
  vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
  onlineResponse = {
    ...onlineDefaults,
    ...{
      status: "fresh",
      days: [
        {
          date: "2026-09-01",
          onlineSeconds: 3600,
          partial: false,
          worlds: ["luvia"],
          worldsComplete: true,
        },
        {
          date: "2026-09-02",
          onlineSeconds: 1800,
          partial: false,
          worlds: ["pandora"],
          worldsComplete: false,
        },
      ],
    },
  };
  killsResponse = {
    ...killsDefaults,
    ...{
      daily: [
        {
          date: "2026-09-01",
          kills: 12,
          partial: false,
          worlds: ["gordion", "luvia"],
        },
        { date: "2026-09-02", kills: 0, partial: false, worlds: [] },
      ],
    },
  };
  renderActivity();
  await screen.findByRole("button", { name: /1 września/ });
  expect(
    screen
      .getByRole("button", { name: /1 września/ })
      .getAttribute("aria-label"),
  ).toContain("Światy: Luvia");
  expect(
    screen
      .getByRole("button", { name: /1 września/ })
      .getAttribute("aria-label"),
  ).not.toContain("Pandora");
  expect(
    screen
      .getByRole("button", { name: /2 września/ })
      .getAttribute("aria-label"),
  ).toContain("Część aktywności");
  fireEvent.click(screen.getByRole("button", { name: "Bicia" }));
  await waitFor(() => expect(killRequests.length).toBeGreaterThan(0));
  expect(
    screen
      .getByRole("button", { name: /1 września/ })
      .getAttribute("aria-label"),
  ).toContain("Światy: Gordion, Luvia");
  expect(
    screen
      .getByRole("button", { name: /2 września/ })
      .getAttribute("aria-label"),
  ).not.toContain("Światy:");
});

it("restores the selected activity mode after remounting", async () => {
  const view = renderActivity();
  fireEvent.click(screen.getByRole("button", { name: "Bicia" }));
  await waitFor(() => expect(killRequests.length).toBeGreaterThan(0));
  view.unmount();
  renderActivity();
  expect(
    screen.getByRole("button", { name: "Bicia" }).getAttribute("aria-pressed"),
  ).toBe("true");
  await waitFor(() => expect(killRequests.length).toBeGreaterThan(0));
});
