import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { beforeEach, describe, expect, it } from "vitest";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { QueryClientProvider } from "@tanstack/react-query";
import { seedReadyRoomCache } from "@/test/ready-room-fixtures";
import { useWindowsStore } from "@/store/windows.store";
import { QuickAccess } from "./quick-access";

const activeReadyRoom: PartyReadyRoomProjection = {
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  organizerCharacter: {
    accountId: "account-1",
    characterId: "character-1",
    icon: "organizer.gif",
    lvl: 200,
    nick: "Organizer",
    prof: "w",
  },
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 1,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:01:00.000Z",
  expiresAt: "2026-07-13T10:30:00.000Z",
  viewer: "PARTICIPANT",
  participants: {},
};

describe("QuickAccess", () => {
  beforeEach(() => {
    useWindowsStore.setState((state) => ({
      ...state,
      "quick-access": {
        ...state["quick-access"],
        open: true,
        collapsed: false,
      },
      currentWindowFocus: undefined,
      windowFocusHistory: [],
    }));
  });

  it("renders when quick access is open", () => {
    const fixture = createGuildPreferencesTest();
    render(
      <QueryClientProvider client={fixture.queryClient}>
        <QuickAccess />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Lootlog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Timery" })).toBeInTheDocument();
    expect(
      document.querySelector("[data-ll-window-resize-handle]"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-ll-quick-access-horizontal-scroll]"),
    ).toBeInTheDocument();

    const scrollViewport = document.querySelector(
      "[data-ll-scroll-area-viewport]",
    );

    expect(scrollViewport).toBeInTheDocument();
    expect(scrollViewport).toHaveStyle({
      overflowX: "scroll",
      overflowY: "hidden",
    });
  });

  it("does not render when quick access is closed", () => {
    useWindowsStore.setState((state) => ({
      ...state,
      "quick-access": {
        ...state["quick-access"],
        open: false,
      },
    }));

    const fixture = createGuildPreferencesTest();
    render(
      <QueryClientProvider client={fixture.queryClient}>
        <QuickAccess />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Lootlog")).not.toBeInTheDocument();
  });

  it("keeps quick access unchanged when an active Ready Room appears", () => {
    useWindowsStore
      .getState()
      .setSize("quick-access", { width: 340, height: 84 });
    const fixture = createGuildPreferencesTest();

    const { rerender } = render(
      <QueryClientProvider client={fixture.queryClient}>
        <QuickAccess />
      </QueryClientProvider>,
    );

    const quickAccessWindow = document.querySelector<HTMLElement>(
      '[data-ll-draggable-window="quick-access"]',
    );

    expect(quickAccessWindow?.style.width).toBe("340px");
    expect(quickAccessWindow?.style.height).toBe("84px");

    act(() => seedReadyRoomCache(fixture.queryClient, [activeReadyRoom]));
    rerender(
      <QueryClientProvider client={fixture.queryClient}>
        <QuickAccess />
      </QueryClientProvider>,
    );

    expect(
      screen.queryByRole("button", { name: "Aktywne zbieranie grupy" }),
    ).not.toBeInTheDocument();
    expect(quickAccessWindow?.style.width).toBe("340px");
    expect(quickAccessWindow?.style.height).toBe("84px");
  });

  it("collapses to the connection state and expands back to the saved size", async () => {
    const user = userEvent.setup();
    useWindowsStore
      .getState()
      .setSize("quick-access", { width: 340, height: 84 });
    const fixture = createGuildPreferencesTest();

    render(
      <QueryClientProvider client={fixture.queryClient}>
        <QuickAccess />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Zwiń pasek" }));

    expect(
      screen.queryByRole("button", { name: "Timery" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rozwiń pasek" })).toHaveFocus();
    expect(
      document.querySelector("[data-ll-window-resize-handle]"),
    ).not.toBeInTheDocument();
    // The collapsed bar must not overwrite the size the bar expands back to.
    expect(useWindowsStore.getState()["quick-access"]).toMatchObject({
      collapsed: true,
      size: { width: 340, height: 84 },
    });

    await user.click(screen.getByRole("button", { name: "Rozwiń pasek" }));

    const quickAccessWindow = document.querySelector<HTMLElement>(
      '[data-ll-draggable-window="quick-access"]',
    );

    expect(screen.getByRole("button", { name: "Timery" })).toBeInTheDocument();
    expect(quickAccessWindow?.style.width).toBe("340px");
    expect(quickAccessWindow?.style.height).toBe("84px");
  });
});
