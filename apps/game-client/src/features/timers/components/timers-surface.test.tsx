import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import type { TimersLayout } from "@lootlog/schema/timer-settings";
import { queryKeys } from "@/features/public-api/query-keys";
import { createTimerFixture } from "@/features/timers/model/timer-fixtures";
import {
  createTimerViewFixture,
  seedGuildTimerLists,
  seedTimerSettings,
} from "@/features/timers/model/timer-view-fixtures";
import { Timers } from "@/features/timers/timers";

const createTimer = (name: string) => {
  const timer = createTimerFixture({
    world: "gefion",
    timerKey: name,
    minSpawnTime: "2099-04-22T10:00:00.000Z",
    maxSpawnTime: "2099-04-22T10:05:00.000Z",
  });

  return { ...timer, npc: { ...timer.npc, name } };
};

afterEach(() => {
  vi.restoreAllMocks();
});

const mountTimers = (layout: TimersLayout) => {
  const fixture = createTimerViewFixture([
    createTimer("Tanroth"),
    createTimer("Mushita"),
  ]);

  seedTimerSettings(fixture.queryClient, {
    "timers.layout": layout,
    "appearance.timers.timersColors": { Tanroth: "red" },
  });
  seedGuildTimerLists(fixture.queryClient, {
    "guild-1": { hiddenTimers: ["Mushita"] },
  });

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <Timers />
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });

  return { ...fixture, view };
};

it.each<TimersLayout>(["legacy", "modern"])(
  "renders the same timers, hidden treatment and context menu in the %s layout",
  async (layout) => {
    const user = userEvent.setup();
    const fixture = mountTimers(layout);

    expect(screen.getByText(/Tanroth/)).toBeVisible();
    expect(screen.queryByText(/Mushita/)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Pokaż ukryte timery" }),
    );
    expect(screen.getByText(/Mushita/)).toBeVisible();
    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByText(/Tanroth/),
    });
    expect(
      await screen.findByRole("menuitem", { name: "Ukryj" }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    expect(fixture.requests).toHaveLength(0);
  },
);

it("switches layouts at runtime without refetching timers or losing the list", async () => {
  const fixture = mountTimers("modern");
  const modernList = screen.getByRole("list");
  expect(within(modernList).getByText(/Tanroth/)).toBeVisible();

  seedTimerSettings(fixture.queryClient, { "timers.layout": "legacy" });

  expect(await screen.findByText(/\[H\] Tanroth/)).toBeVisible();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
  expect(fixture.requests).toHaveLength(0);
  expect(
    fixture.queryClient
      .getQueryCache()
      .find({ queryKey: queryKeys.timers("gefion") })
      ?.getObserversCount(),
  ).toBe(1);
});

it("hides the header, filters bar and footer of the modern layout through the appearance switches", async () => {
  const fixture = mountTimers("modern");
  seedTimerSettings(fixture.queryClient, {
    "timers.timerFiltersEnabled": true,
  });
  expect(await screen.findByPlaceholderText("Szukaj...")).toBeVisible();
  expect(screen.getByRole("button", { name: "Dodaj timer" })).toBeVisible();

  seedTimerSettings(fixture.queryClient, {
    "appearance.timers.modern": {
      showHeader: false,
      showFiltersBar: false,
      showFooter: false,
    },
  });

  await vi.waitFor(() =>
    expect(screen.queryByPlaceholderText("Szukaj...")).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("button", { name: "Dodaj timer" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Tanroth/)).toBeVisible();
});
