import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { Schema } from "effect";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { Permission } from "@lootlog/schema/permissions";
import { useGameStore } from "@/store/game.store";
import { useTimersStore } from "@/store/timers.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  createTimerFixture,
  createTimerMemberFixture,
} from "../timer-fixtures";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { TimerClockProvider } from "./timer-clock-provider";
import { SingleTimer } from "./single-timer";

const NOW = new Date("2026-04-22T10:00:00.000Z").getTime();

const decodeMutationWorld = Schema.decodeUnknownSync(
  Schema.Struct({ world: Schema.String }),
);

const resetStore = () =>
  useTimersStore.setState(useTimersStore.getInitialState(), true);

beforeEach(() => {
  resetStore();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  resetStore();
  useGameStore.getState().clearGame();
  vi.restoreAllMocks();
});

const createTimer = () => ({
  ...createTimerFixture({
    minSpawnTime: new Date(NOW + 5000).toISOString(),
    maxSpawnTime: new Date(NOW + 10000).toISOString(),
    wasReset: true,
    members: [createTimerMemberFixture()],
  }),
  minTimeLeft: 5000,
  maxTimeLeft: 10000,
});

describe("SingleTimer", () => {
  it.each([
    {
      action: "reset",
      menu: "Zresetuj timer",
      confirmation: "Zresetuj",
      method: "PATCH",
      pathname: "/guilds/guild-1/timers/timer-1/reset",
    },
    {
      action: "delete",
      menu: "Usuń timer",
      confirmation: "Usuń",
      method: "DELETE",
      pathname: "/guilds/guild-1/timers/timer-1",
    },
  ])(
    "confirms $action for the displayed world without changing the current game's matching timer",
    async ({ action, menu, confirmation, method, pathname }) => {
      const user = userEvent.setup();
      setTestRuntimeGame({ world: "luvia" });
      const currentWorldTimer = { ...createTimer(), wasReset: false };
      const displayedTimer = { ...currentWorldTimer, world: "zemyna" };

      const records = new Map([
        [currentWorldTimer.world, currentWorldTimer],
        [displayedTimer.world, displayedTimer],
      ]);

      const fixture = createTimerHttpFixture(async (request) => {
        const world =
          request.method === "PATCH"
            ? decodeMutationWorld(await request.clone().json()).world
            : new URL(request.url).searchParams.get("world");

        const storedTimer = world ? records.get(world) : undefined;

        if (!storedTimer) {
          return Response.json({ message: "Timer not found" }, { status: 404 });
        }

        if (request.method === "DELETE") {
          records.delete(storedTimer.world);

          return new Response(null, { status: 204 });
        }

        const resetTimer = { ...storedTimer, wasReset: true };
        records.set(storedTimer.world, resetTimer);

        return Response.json(resetTimer);
      });

      useTimersStore.setState((state) => ({
        generalConfig: { ...state.generalConfig, timersGrouping: false },
      }));

      const view = render(
        <QueryClientProvider client={fixture.queryClient}>
          <TimerClockProvider>
            <SingleTimer
              guildIds={[displayedTimer.guildId]}
              guildNamesById={{}}
              accessPolicy={createAccessPolicy({
                capabilities: [
                  Permission.LOOTLOG_TIMERS_DELETE,
                  Permission.LOOTLOG_TIMERS_RESET,
                ],
              })}
              timer={displayedTimer}
              settingsKey={displayedTimer.guildId}
            />
          </TimerClockProvider>
        </QueryClientProvider>,
      );

      onTestFinished(() => {
        view.unmount();
        fixture.cleanup();
      });

      await user.pointer({
        keys: "[MouseRight]",
        target: screen.getByText(/Tanroth/),
      });
      await user.click(screen.getByRole("menuitem", { name: menu }));
      expect(fixture.requests).toHaveLength(0);
      await user.click(screen.getByRole("button", { name: confirmation }));
      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
      expect(fixture.requests).toHaveLength(1);
      const request = fixture.requests.at(0);

      if (!request) throw new Error("Expected a timer mutation request");

      const url = new URL(request.url);

      const sentScope =
        request.method === "PATCH"
          ? await request.json()
          : { world: url.searchParams.get("world") };

      expect(request.method).toBe(method);
      expect(url.pathname).toBe(pathname);
      expect(sentScope).toEqual({ world: displayedTimer.world });
      expect(records.get(currentWorldTimer.world)).toEqual(currentWorldTimer);
      expect(records.get(displayedTimer.world)).toEqual(
        action === "reset" ? { ...displayedTimer, wasReset: true } : undefined,
      );
    },
  );

  it.each([false, true])(
    "renders countdown, tooltip and authorized actions (legacy: %s)",
    async (legacyAppearance) => {
      const user = userEvent.setup();
      const fixture = createTimerHttpFixture();
      const state = useTimersStore.getState();
      useTimersStore.setState({
        timersColors: { Tanroth: "red" },
        pinnedTimers: { "guild-1": ["Tanroth"] },
        displayConfig: {
          ...state.displayConfig,
          showType: true,
          showLevel: true,
          legacyAppearance,
        },
        generalConfig: {
          ...state.generalConfig,
          timersGrouping: false,
          countdownMode: "max",
        },
      });
      const timer = createTimer();

      const content = (capabilities: Permission[]) => (
        <QueryClientProvider client={fixture.queryClient}>
          <TimerClockProvider>
            <SingleTimer
              guildIds={["guild-1", "guild-2"]}
              guildNamesById={{ "guild-1": "Alpha" }}
              accessPolicy={createAccessPolicy({ capabilities })}
              timer={timer}
              settingsKey="guild-1"
            />
          </TimerClockProvider>
        </QueryClientProvider>
      );

      const view = render(
        content([
          Permission.LOOTLOG_TIMERS_DELETE,
          Permission.LOOTLOG_TIMERS_RESET,
        ]),
      );

      onTestFinished(() => {
        view.unmount();
        fixture.cleanup();
      });
      const label = screen.getByText(/\[R\] \[H\] Tanroth/);
      expect(label).toHaveTextContent("(120w)");
      expect(screen.getByText("00:00:10")).toBeVisible();
      await user.hover(label);
      expect(await screen.findByText("Tester (Alpha)")).toBeVisible();
      await user.pointer({ keys: "[MouseRight]", target: label });
      expect(
        await screen.findByRole("menuitem", { name: "Usuń timer" }),
      ).toBeVisible();
      expect(
        screen.getByRole("menuitem", { name: "Zresetuj timer" }),
      ).toBeVisible();
      expect(screen.getByRole("menuitem", { name: "Odepnij" })).toBeVisible();
      view.rerender(content([]));
      expect(
        screen.queryByRole("menuitem", { name: "Usuń timer" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("menuitem", { name: "Zresetuj timer" }),
      ).not.toBeInTheDocument();
    },
  );

  it("opens the timer actions from the keyboard", async () => {
    const user = userEvent.setup();
    const fixture = createTimerHttpFixture();

    const view = render(
      <QueryClientProvider client={fixture.queryClient}>
        <TimerClockProvider>
          <SingleTimer
            guildIds={["guild-1"]}
            guildNamesById={{}}
            accessPolicy={createAccessPolicy({
              capabilities: [Permission.LOOTLOG_TIMERS_DELETE],
            })}
            timer={createTimer()}
            settingsKey="guild-1"
          />
        </TimerClockProvider>
      </QueryClientProvider>,
    );

    onTestFinished(() => {
      view.unmount();
      fixture.cleanup();
    });

    await user.tab();
    await user.keyboard("{Shift>}{F10}{/Shift}");

    expect(
      await screen.findByRole("menuitem", { name: "Usuń timer" }),
    ).toBeVisible();
  });

  it("shows pending and hidden states with the configured custom color", async () => {
    const user = userEvent.setup();
    const fixture = createTimerHttpFixture();
    const state = useTimersStore.getState();
    useTimersStore.setState({
      timersColors: { Tanroth: "custom-1" },
      customColors: {
        "custom-1": {
          id: "custom-1",
          name: "Custom",
          borderColor: "#111111",
          backgroundColor: "#222222",
        },
      },
      generalConfig: {
        ...state.generalConfig,
        timersGrouping: true,
        countdownMode: "max",
      },
    });

    const view = render(
      <QueryClientProvider client={fixture.queryClient}>
        <TimerClockProvider>
          <SingleTimer
            guildIds={["guild-1"]}
            guildNamesById={{}}
            accessPolicy={createAccessPolicy({ capabilities: [] })}
            timer={{ ...createTimer(), isPending: true }}
            settingsKey="guild-1"
            isHidden
          />
        </TimerClockProvider>
      </QueryClientProvider>,
    );

    onTestFinished(() => {
      view.unmount();
      fixture.cleanup();
    });
    const tile = view.container.querySelector('[id="10"]');
    expect(tile).toHaveStyle({
      "--ll-timer-accent": "#111111",
      "--ll-list-row-fill": "#222222",
    });
    expect(tile?.parentElement).toHaveClass("ll:opacity-50");
    expect(screen.getByText("00:00:10").parentElement).toHaveClass(
      "ll:opacity-60",
    );
    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByText(/Tanroth/),
    });
    expect(await screen.findByText("Tworzenie timera…")).toBeVisible();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });
});
