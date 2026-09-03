import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTimersStore } from "@/store/timers.store";
import { HiddenTimersTab } from "./hidden-timers-tab";
import * as UsersModule from "@lootlog/client/main";

const hiddenTimersSpy = vi.fn();

vi.mock("@lootlog/client/main", async () => {
  const actual = await vi.importActual<typeof UsersModule>(
    "@lootlog/client/main",
  );

  return {
    ...actual,
    useUsersControllerGetCurrentUserAccessibleGuilds: vi.fn(),
  };
});

vi.mock("./hidden-timers", () => ({
  HiddenTimers: ({ guildId }: { guildId?: string }) => {
    hiddenTimersSpy(guildId);

    return <div>HiddenTimers guildId: {guildId ?? "none"}</div>;
  },
}));

describe("HiddenTimersTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTimersStore.setState((state) => ({
      ...state,
      generalConfig: {
        ...state.generalConfig,
        timersGrouping: false,
      },
    }));
  });

  it("auto-selects the first guild and lets the user switch the scope", async () => {
    const user = userEvent.setup();

    vi.mocked(
      UsersModule.useUsersControllerGetCurrentUserAccessibleGuilds,
    ).mockReturnValue({
      data: [
        { id: "guild-1", name: "Alpha", icon: null, ownerId: "owner-1" },
        { id: "guild-2", name: "Beta", icon: null, ownerId: "owner-1" },
      ],
      isFetched: true,
    } as ReturnType<
      typeof UsersModule.useUsersControllerGetCurrentUserAccessibleGuilds
    >);

    render(<HiddenTimersTab />);

    expect(
      screen.getByText("HiddenTimers guildId: guild-1"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Wybierz gildię Beta: Wyłączone",
      }),
    );

    expect(
      screen.getByText("HiddenTimers guildId: guild-2"),
    ).toBeInTheDocument();
  });

  it("hides the selector when grouping is enabled", () => {
    vi.mocked(
      UsersModule.useUsersControllerGetCurrentUserAccessibleGuilds,
    ).mockReturnValue({
      data: [{ id: "guild-1", name: "Alpha", icon: null, ownerId: "owner-1" }],
      isFetched: true,
    } as ReturnType<
      typeof UsersModule.useUsersControllerGetCurrentUserAccessibleGuilds
    >);
    useTimersStore.setState((state) => ({
      ...state,
      generalConfig: {
        ...state.generalConfig,
        timersGrouping: true,
      },
    }));

    render(<HiddenTimersTab />);

    expect(
      screen.queryByRole("button", {
        name: "Wybierz gildię Alpha: Wyłączone",
      }),
    ).not.toBeInTheDocument();
    expect(hiddenTimersSpy).toHaveBeenLastCalledWith("");
  });
});
