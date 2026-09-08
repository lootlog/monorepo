import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
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
import { useTimersStore } from "@/store/timers.store";
import {
  createTimerFixture,
  createTimerMemberFixture,
} from "../timer-fixtures";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { TimerClockProvider } from "./timer-clock-provider";
import { SingleTimer } from "./single-timer";

const NOW = new Date("2026-04-22T10:00:00.000Z").getTime();
const resetStore = () =>
  useTimersStore.setState(useTimersStore.getInitialState(), true);
beforeEach(() => {
  resetStore();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});
afterEach(() => {
  resetStore();
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
  it("renders the real countdown and metadata, and exposes actions according to its access policy", async () => {
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
    expect(view.container.querySelector('[id="10"]')).toHaveClass(
      "ll:bg-red-500/20",
    );
    await user.hover(label);
    expect(await screen.findByText("Tester (Alpha)")).toBeVisible();
    await user.pointer({ keys: "[MouseRight]", target: label });
    expect(
      await screen.findByRole("menuitem", { name: "Usuń timer" }),
    ).toBeVisible();
    expect(
      screen.getByRole("menuitem", { name: "Odliczaj od początku" }),
    ).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Odepnij" })).toBeVisible();
    view.rerender(content([]));
    expect(
      screen.queryByRole("menuitem", { name: "Usuń timer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Odliczaj od początku" }),
    ).not.toBeInTheDocument();
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
      borderColor: "#111111",
      backgroundColor: "#222222",
    });
    expect(tile?.parentElement).toHaveClass("ll:opacity-50");
    expect(screen.getByText("00:00:10").parentElement).toHaveClass(
      "ll:opacity-60",
    );
    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByText(/Tanroth/),
    });
    expect(await screen.findByText("Tworzenie timera...")).toBeVisible();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });
});
