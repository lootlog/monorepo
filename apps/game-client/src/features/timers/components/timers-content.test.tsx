import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getGuildsControllerGetWorldsByGuildIdQueryKey,
  getGuildsControllerGetGuildPermissionsQueryKey,
} from "@lootlog/client/main";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { useTimersStore } from "@/store/timers.store";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTimerFixture, createTimerGuildFixture } from "../timer-fixtures";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { TimersContent } from "./timers-content";

beforeEach(() => {
  useTimersStore.setState(useTimersStore.getInitialState(), true);
  setTestRuntimeGame({
    hero: { accountId: "200", characterId: "101" },
    world: "pandora",
  });
  useSettingsStore.setState({
    guildIdByCharId: { "101": "guild-1" },
    worldByGuildId: { "guild-1": "pandora" },
  });
});

afterEach(() => {
  vi.useRealTimers();
  useGameStore.getState().clearGame();
});

const mountContent = (
  overrides: Partial<ComponentProps<typeof TimersContent>> = {},
) => {
  const fixture = createTimerHttpFixture((request) =>
    Response.json(
      new URL(request.url).pathname.endsWith("/worlds")
        ? ["pandora", "gefion"]
        : [],
    ),
  );

  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [
      createTimerGuildFixture(),
      createTimerGuildFixture({ id: "guild-2", name: "Beta" }),
    ],
  );
  fixture.queryClient.setQueryData(
    getGuildsControllerGetWorldsByGuildIdQueryKey({ guildId: "guild-1" }),
    ["pandora", "gefion"],
  );
  fixture.queryClient.setQueryData(
    getGuildsControllerGetGuildPermissionsQueryKey({ guildId: "guild-1" }),
    [],
  );
  const onAddTimer = vi.fn<() => void>();
  const onRetry = vi.fn<() => void>();
  const onResetFilters = vi.fn<() => void>();
  const onPointerDown = vi.fn<() => void>();

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <div onPointerDown={onPointerDown}>
        <TimersContent
          sortedTimers={[]}
          settingsKey="guild-1"
          hiddenTimers={[]}
          areFiltersActive={false}
          colorStatistics={[]}
          guildId="guild-1"
          isGrouping={false}
          allowWorldSelection
          timerFiltersEnabled
          isUnderBag={false}
          minColumnWidth={180}
          world="pandora"
          onAddTimer={onAddTimer}
          onResetFilters={onResetFilters}
          onRetry={onRetry}
          {...overrides}
        />
      </div>
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });

  return { onAddTimer, onRetry, onResetFilters, onPointerDown };
};

it("shows delayed loading feedback without falsely presenting an empty timer list", () => {
  vi.useFakeTimers();
  mountContent({ initialLoading: true });
  expect(screen.queryByText("Brak timerów")).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(200));
  expect(screen.getByRole("status").querySelector("svg")).toHaveClass(
    "ll:animate-spin",
  );
  expect(screen.queryByText("Brak timerów")).not.toBeInTheDocument();
});

it("lets users retry an initial request failure", async () => {
  const user = userEvent.setup();
  const { onRetry } = mountContent({ error: new Error("network") });
  expect(screen.getByText("Nie udało się załadować timerów")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
  expect(onRetry).toHaveBeenCalledOnce();
  expect(screen.queryByText("Brak timerów")).not.toBeInTheDocument();
});

it("renders real controls and timer tiles while retaining scroll and window drag behavior", async () => {
  const user = userEvent.setup();

  const timer = {
    ...createTimerFixture(),
    minTimeLeft: 60_000,
    maxTimeLeft: 120_000,
  };

  const { onAddTimer, onPointerDown } = mountContent({ sortedTimers: [timer] });
  expect(screen.getByPlaceholderText("Szukaj...")).toBeVisible();
  expect(screen.getByRole("combobox")).toHaveTextContent(/pandora/i);
  const label = screen.getByText(/\[H\] Tanroth/);
  expect(label).toBeVisible();
  const scrollContainer = screen.getByTestId("timers-scroll-container");
  expect(scrollContainer).toHaveClass(
    "ll:min-h-0",
    "ll:h-full",
    "ll:overflow-hidden",
  );
  expect(
    scrollContainer.querySelector("[data-ll-scroll-area-viewport]"),
  ).toHaveStyle({ overflowX: "hidden", overflowY: "scroll" });
  fireEvent.pointerDown(scrollContainer);
  fireEvent.pointerDown(label);
  expect(onPointerDown).toHaveBeenCalledTimes(2);
  await user.click(screen.getByRole("button", { name: "+" }));
  expect(onAddTimer).toHaveBeenCalledOnce();
});

it("offers filter recovery in compact mode without the regular toolbar or footer", async () => {
  const user = userEvent.setup();

  const { onResetFilters } = mountContent({
    compactView: true,
    areFiltersActive: true,
    isUnderBag: true,
  });

  expect(screen.getByText("Brak pasujących timerów")).toBeVisible();
  expect(screen.queryByPlaceholderText("Szukaj...")).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "+" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Pokaż wszystkie" }));
  expect(onResetFilters).toHaveBeenCalledOnce();
});
