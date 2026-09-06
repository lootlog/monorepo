// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import "@/i18n/config";
import { DashboardActivity } from "./dashboard-activity";
const mocks = vi.hoisted(() => ({ online: vi.fn(), kills: vi.fn() }));
vi.mock("@lootlog/client/main", () => ({
  useKillsControllerGetUserKillActivity: mocks.kills,
}));
vi.mock("@lootlog/client/activity", () => ({
  useUsersActivityControllerGetOnline: mocks.online,
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("defaults to lightweight online and enables kills activity only on demand", () => {
  const query = {
    isPending: true,
    isError: false,
    isFetching: false,
    data: undefined,
    refetch: vi.fn(),
  };
  mocks.online.mockReturnValue(query);
  mocks.kills.mockReturnValue(query);
  render(<DashboardActivity />);
  const onlineButton = screen.getByRole("button", { name: "Online" });
  fireEvent.click(onlineButton);
  expect(onlineButton.getAttribute("aria-pressed")).toBe("true");
  expect(mocks.online.mock.lastCall?.[1].query.enabled).toBe(true);
  expect(mocks.kills.mock.lastCall?.[1].query.enabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Bicia" }));
  expect(mocks.online.mock.lastCall?.[1].query.enabled).toBe(false);
  expect(mocks.kills.mock.lastCall?.[1].query.enabled).toBe(true);
});

it("requests 112 inclusive days and hides older cached kill activity", () => {
  vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
  const query = {
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
  mocks.online.mockReturnValue({
    ...query,
    data: { status: "fresh", days: [] },
  });
  mocks.kills.mockReturnValue({
    ...query,
    data: {
      meta: { coverage: "complete" },
      daily: [
        { date: "2026-05-17", kills: 8, partial: false },
        { date: "2026-05-18", kills: 9, partial: false },
        { date: "2026-09-06", kills: 10, partial: true },
      ],
    },
  });
  render(<DashboardActivity />);
  expect(mocks.online.mock.lastCall?.[0]).toEqual({
    from: "2026-05-18",
    to: "2026-09-06",
  });
  fireEvent.click(screen.getByRole("button", { name: "Bicia" }));
  expect(screen.queryByRole("button", { name: /17 maja/ })).toBeNull();
  expect(screen.getByRole("button", { name: /18 maja/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /6 września/ })).toBeTruthy();
});

it("uses the lowest activity level for missing days in both tabs without details or coverage notices", () => {
  vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
  const query = {
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
  mocks.online.mockReturnValue({
    ...query,
    data: {
      status: "fresh",
      days: [{ date: "2026-09-01", onlineSeconds: null, partial: false }],
    },
  });
  mocks.kills.mockReturnValue({
    ...query,
    data: {
      meta: { coverage: "partial" },
      daily: [{ date: "2026-09-01", kills: null, partial: false }],
    },
  });
  render(<DashboardActivity />);
  for (const mode of ["Online", "Bicia"]) {
    fireEvent.click(screen.getByRole("button", { name: mode }));
    const day = screen.getByRole("button", { name: /1 września/ });
    expect(day.getAttribute("aria-label")).not.toContain("Brak danych");
    expect(day.classList.contains("bg-muted")).toBe(true);
    fireEvent.click(day);
    expect(document.querySelector("p[aria-live=polite]")).toBeNull();
    expect(screen.queryByText("Brak danych")).toBeNull();
    expect(screen.queryByText(/Wybierz dzień/)).toBeNull();
    expect(screen.queryByText(/Historia godzinowa/)).toBeNull();
  }
});

it("passes each day's source worlds independently in both activity tabs", () => {
  vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
  const query = {
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
  mocks.online.mockReturnValue({
    ...query,
    data: {
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
  });
  mocks.kills.mockReturnValue({
    ...query,
    data: {
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
  });
  render(<DashboardActivity />);
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
