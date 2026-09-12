import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getGuildsControllerGetWorldsByGuildIdQueryKey,
  getGuildsControllerGetGuildPermissionsQueryKey,
} from "@lootlog/client/main";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  createTimerFixture,
  createTimerGuildFixture,
} from "@/features/timers/model/timer-fixtures";
import { createTimerHttpFixture } from "@/features/timers/model/timer-http-fixtures";
import {
  createTimersWindowModelFixture,
  type TimersWindowModelOverrides,
} from "@/features/timers/model/timers-window-model-fixture";
import type { TimersSurfaceKind } from "@/features/timers/hooks/use-timers-window-model";
import { LegacyTimersSurface } from "./legacy-timers-surface";

beforeEach(() => {
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
  overrides: TimersWindowModelOverrides = {},
  surface: TimersSurfaceKind = "window",
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
  const onPointerDown = vi.fn<() => void>();

  const model = createTimersWindowModelFixture({
    ...overrides,
    scope: { allowWorldSelection: true, ...overrides.scope },
    appearance: {
      displayConfig: { minColumnWidth: 180 },
      ...overrides.appearance,
    },
  });

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <div onPointerDown={onPointerDown}>
        <LegacyTimersSurface model={model} surface={surface} />
      </div>
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });

  return {
    onAddTimer: model.actions.openAddTimer,
    onRetry: model.async.retry,
    onResetFilters: model.actions.resetFilters,
    onPointerDown,
  };
};

it("shows delayed loading feedback without falsely presenting an empty timer list", () => {
  vi.useFakeTimers();
  mountContent({ async: { initialLoading: true } });
  expect(screen.queryByText("Brak timerów")).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(200));
  expect(screen.getByRole("status").querySelector("svg")).toHaveClass(
    "ll:animate-spin",
  );
  expect(screen.queryByText("Brak timerów")).not.toBeInTheDocument();
});

it("lets users retry an initial request failure", async () => {
  const user = userEvent.setup();

  const { onRetry } = mountContent({
    async: { initialError: new Error("network") },
  });

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

  const { onAddTimer, onPointerDown } = mountContent({
    list: { timers: [timer] },
  });

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

  const { onResetFilters } = mountContent(
    {
      appearance: { compactView: true },
      list: { areFiltersActive: true },
    },
    "under-bag",
  );

  expect(screen.getByText("Brak pasujących timerów")).toBeVisible();
  expect(screen.queryByPlaceholderText("Szukaj...")).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "+" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Pokaż wszystkie" }));
  expect(onResetFilters).toHaveBeenCalledOnce();
});
