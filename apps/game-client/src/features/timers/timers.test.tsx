import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import { getGuildsControllerGetWorldsByGuildIdQueryKey } from "@lootlog/client/main";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimersStore, DEFAULT_TIMERS_FILTERS } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import { useSettingsStore } from "@/store/settings.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTimerFixture } from "./timer-fixtures";
import { createTimerViewFixture } from "./timer-view-fixtures";
import { Timers } from "./timers";
import { AppSocket } from "@/lib/socket";

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

it.each([
  { underBag: false, selectWorld: false },
  { underBag: false, selectWorld: true },
  { underBag: true, selectWorld: false },
  { underBag: true, selectWorld: true },
])(
  "adds a manual timer to the displayed world (underBag=$underBag, selectWorld=$selectWorld)",
  async ({ underBag, selectWorld }) => {
    const user = userEvent.setup();

    const fixture = mountTimers((value) => {
      setTestRuntimeGame({ hero: { characterId: "101" }, world: "luvia" });
      useSettingsStore.setState({ allowWorldSelection: selectWorld });

      const worldsKey = getGuildsControllerGetWorldsByGuildIdQueryKey({
        guildId: "guild-1",
      });

      value.queryClient.setQueryDefaults(worldsKey, { staleTime: Infinity });
      value.queryClient.setQueryData(worldsKey, ["luvia", "gefion"]);
      value.queryClient.setQueryData(queryKeys.timers("luvia"), []);
      useTimersStore.setState((state) => ({
        generalConfig: { ...state.generalConfig, timersUnderBag: underBag },
      }));
    });

    expect(
      screen.queryByRole("dialog", { name: /Dodaj timer/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dodaj timer" }));
    const panel = screen.getByRole("dialog", { name: /Dodaj timer/ });
    expect(panel).toBeVisible();
    expect(screen.getByRole("button", { name: "Dodaj timer" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.type(within(panel).getByLabelText("Nazwa"), "Tanroth");
    await user.type(
      within(panel).getByLabelText("Minimalny czas (maks. 300 h)"),
      "1m",
    );
    await user.type(
      within(panel).getByLabelText("Maksymalny czas (maks. 300 h)"),
      "2m",
    );
    await user.click(within(panel).getByRole("button", { name: "Dodaj" }));

    const posts = () =>
      fixture.requests.filter((request) => request.method === "POST");

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]?.url).toContain("/guilds/guild-1/timers/manual");
    const payload = await posts()[0].json();
    expect(payload.world).toBe(selectWorld ? "gefion" : "luvia");
    expect(payload.actorCharacter?.characterId).toBe(
      selectWorld ? undefined : "101",
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: /Dodaj timer/ }),
      ).not.toBeInTheDocument(),
    );
    expect(useWindowsStore.getState()).not.toHaveProperty("add-timer");
  },
);

it("closes the add timer overlay with Escape and keeps the window open", async () => {
  const user = userEvent.setup();
  mountTimers();
  await user.click(screen.getByRole("button", { name: "Dodaj timer" }));
  expect(screen.getByRole("dialog", { name: /Dodaj timer/ })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("dialog", { name: /Dodaj timer/ }),
  ).not.toBeInTheDocument();
  expect(useWindowsStore.getState().timers.open).toBe(true);
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
  // No realtime session here; use-timers-socket.test covers the wait for one.
  vi.spyOn(AppSocket.prototype, "waitForSession").mockResolvedValue();

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

it("shows and hides the under-bag panel with the timers open state", () => {
  const fixture = mountTimers(() => {
    useWindowsStore.getState().setOpen("timers", false);
    useTimersStore.setState((state) => ({
      generalConfig: { ...state.generalConfig, timersUnderBag: true },
    }));
  });

  expect(
    within(fixture.gameColumn).queryByText(/\[H\] Tanroth/),
  ).not.toBeInTheDocument();

  act(() => useWindowsStore.getState().toggleOpen("timers"));
  expect(within(fixture.gameColumn).getByText(/\[H\] Tanroth/)).toBeVisible();

  act(() => useWindowsStore.getState().toggleOpen("timers"));
  expect(
    within(fixture.gameColumn).queryByText(/\[H\] Tanroth/),
  ).not.toBeInTheDocument();
});

it("uses the game world under the NI bag when world selection is disabled", () => {
  const fixture = mountTimers((value) => {
    setTestRuntimeGame({ interface: "ni", world: "luvia" });
    value.queryClient.setQueryData(queryKeys.timers("luvia"), [
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
      .find({ queryKey: queryKeys.timers("luvia") })
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
