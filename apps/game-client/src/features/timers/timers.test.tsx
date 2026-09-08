import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimersStore, DEFAULT_TIMERS_FILTERS } from "@/store/timers.store";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTimerFixture } from "./timer-fixtures";
import { createTimerViewFixture } from "./timer-view-fixtures";
import { Timers } from "./timers";

const createVisibleTimer = () =>
  createTimerFixture({
    world: "gefion",
    minSpawnTime: "2099-04-22T10:00:00.000Z",
    maxSpawnTime: "2099-04-22T10:05:00.000Z",
  });
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const mountTimers = (
  setup: (
    fixture: ReturnType<typeof createTimerViewFixture>,
  ) => void = () => {},
) => {
  const fixture = createTimerViewFixture([createVisibleTimer()]);
  setup(fixture);
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
it("deduplicates timers and shows the same visible state in the regular and under-bag surfaces", () => {
  const fixture = mountTimers((value) =>
    value.queryClient.setQueryData(queryKeys.timers("gefion"), [
      createVisibleTimer(),
      { ...createVisibleTimer(), updatedAt: "2099-04-22T09:59:01.000Z" },
    ]),
  );
  expect(screen.getAllByText(/\[H\] Tanroth/)).toHaveLength(1);
  expect(
    within(fixture.gameColumn).queryByText(/\[H\] Tanroth/),
  ).not.toBeInTheDocument();
  act(() =>
    useTimersStore.setState((state) => ({
      generalConfig: { ...state.generalConfig, timersUnderBag: true },
    })),
  );
  expect(within(fixture.gameColumn).getByText(/\[H\] Tanroth/)).toBeVisible();
  expect(screen.getAllByText(/\[H\] Tanroth/)).toHaveLength(1);
});
it("opens add timer with the selected guild without changing the saved creation preference", async () => {
  const user = userEvent.setup();
  mountTimers(() =>
    useSettingsStore.setState({
      selectedGuildIdsForTimersByCharId: { "101": ["guild-2"] },
    }),
  );
  await user.click(screen.getByRole("button", { name: "+" }));
  expect(useWindowsStore.getState()["add-timer"]).toMatchObject({
    open: true,
    state: { guildId: "guild-1" },
  });
  expect(useSettingsStore.getState().selectedGuildIdsForTimersByCharId).toEqual(
    { "101": ["guild-2"] },
  );
});
it("recovers from empty filters without erasing the user's saved hidden timers", async () => {
  const user = userEvent.setup();
  mountTimers(() =>
    useTimersStore.setState({
      timerFiltersSearchText: "missing",
      hiddenTimers: { "guild-1": ["timer-1"] },
    }),
  );
  expect(screen.queryByText(/\[H\] Tanroth/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Pokaż wszystkie" }));
  expect(useTimersStore.getState().timerFiltersSearchText).toBe("");
  expect(useTimersStore.getState().timersFilters["guild-1"]).toEqual(
    DEFAULT_TIMERS_FILTERS,
  );
  expect(useTimersStore.getState().hiddenTimers).toEqual({
    "guild-1": ["timer-1"],
  });
  expect(screen.getByText(/\[H\] Tanroth/)).toBeVisible();
});
it("retries a failed world request and displays the recovered timer", async () => {
  const user = userEvent.setup();
  const requests: Request[] = [];
  const fixture = mountTimers((value) => {
    value.queryClient.removeQueries({ queryKey: queryKeys.timers("gefion") });
    const restore = configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: (input, init) => {
          requests.push(new Request(input, init));
          return Promise.resolve(
            requests.length === 1
              ? Response.json({ message: "offline" }, { status: 503 })
              : Response.json([
                  {
                    ...createVisibleTimer(),
                    npc: {
                      ...createVisibleTimer().npc,
                      wt: "85",
                      margonemType: "2",
                      location: "Ruins",
                    },
                  },
                ]),
          );
        },
      },
    });
    onTestFinished(restore);
  });
  expect(
    await screen.findByText("Nie udało się załadować timerów"),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
  expect(await screen.findByText(/\[H\] Tanroth/)).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(
    requests.every(
      (request) => new URL(request.url).searchParams.get("world") === "gefion",
    ),
  ).toBe(true);
  await waitFor(() => expect(fixture.queryClient.isFetching()).toBe(0));
});
it("uses the game world under the NI bag when world selection is disabled", () => {
  const fixture = mountTimers((value) => {
    setTestRuntimeGame({ interface: "ni", world: "pandora" });
    value.queryClient.setQueryData(queryKeys.timers("pandora"), [
      createVisibleTimer(),
    ]);
    useTimersStore.setState((state) => ({
      generalConfig: { ...state.generalConfig, timersUnderBag: true },
    }));
  });
  expect(within(fixture.gameColumn).getByText(/\[H\] Tanroth/)).toBeVisible();
  expect(
    fixture.queryClient
      .getQueryCache()
      .find({ queryKey: queryKeys.timers("pandora") })
      ?.getObserversCount(),
  ).toBe(1);
  expect(
    fixture.queryClient
      .getQueryCache()
      .find({ queryKey: queryKeys.timers("gefion") })
      ?.getObserversCount(),
  ).toBe(0);
});
it.each(["filtered", "closed"] as const)(
  "does not start countdown work when timers are %s",
  (state) => {
    vi.useFakeTimers();
    const intervals = vi.spyOn(globalThis, "setInterval");
    const fixture = mountTimers(() => {
      if (state === "closed")
        useWindowsStore.getState().setOpen("timers", false);
      else
        useTimersStore.setState((value) => ({
          timerFiltersSearchText: "missing",
          generalConfig: { ...value.generalConfig, timersUnderBag: true },
        }));
    });
    expect(intervals).not.toHaveBeenCalled();
    expect(screen.queryByText(/\[H\] Tanroth/)).not.toBeInTheDocument();
    expect(
      fixture.queryClient
        .getQueryCache()
        .find({ queryKey: queryKeys.timers("gefion") })
        ?.getObserversCount(),
    ).toBe(state === "closed" ? 0 : 1);
  },
);
