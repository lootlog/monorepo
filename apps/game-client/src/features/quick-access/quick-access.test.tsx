import { act, fireEvent, render, screen } from "@testing-library/react";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { beforeEach, describe, expect, it, onTestFinished } from "vitest";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { QueryClientProvider } from "@tanstack/react-query";
import { seedReadyRoomCache } from "@/test/ready-room-fixtures";
import { useWindowsStore } from "@/store/windows.store";
import { createNotificationTest } from "@/features/notifications/notification-test";
import { useNotificationsStore } from "@/store/notifications.store";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
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

const createHero = (id: number): GameNpcWithLocation => ({
  id,
  tpl: id,
  nick: `Heros ${id}`,
  icon: "npc.gif",
  prof: "w",
  lvl: 120,
  wt: 85,
  type: 2,
  x: 10,
  y: 20,
  location: "Ithan",
  notificationSentAt: null,
});

describe("QuickAccess", () => {
  beforeEach(() => {
    useWindowsStore.setState((state) => ({
      ...state,
      "quick-access": {
        ...state["quick-access"],
        open: true,
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

  it("leads back to a closed detector or notifications window while it keeps entries", () => {
    const test = createNotificationTest();
    useWindowsStore.getState().setOpen("npc-detector", false);
    useNpcDetectorStore.setState({ npcs: [createHero(1), createHero(2)] });
    useNotificationsStore.setState({
      notifications: [
        {
          createdAt: "2026-06-22T00:00:00.000Z",
          discordId: "discord-1",
          guildId: "guild-1",
          listKey: "mention",
          message: "Wzmianka",
          notificationId: "mention",
          receivedAtMs: Date.now(),
          servers: ["guild-1"],
          type: "chat-mention",
          world: "luvia",
        },
      ],
    });
    onTestFinished(() =>
      act(() => {
        useNpcDetectorStore.setState(
          useNpcDetectorStore.getInitialState(),
          true,
        );
        useNotificationsStore.setState(
          useNotificationsStore.getInitialState(),
          true,
        );
        useWindowsStore.getState().setOpen("npc-detector", false);
        useWindowsStore.getState().setOpen("notifications", false);
      }),
    );

    render(<QuickAccess />, { wrapper: test.wrapper });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Pokaż wykrywacz: 2 wykryte potwory",
      }),
    );
    expect(useWindowsStore.getState()["npc-detector"].open).toBe(true);
    expect(
      screen.queryByRole("button", { name: /Pokaż wykrywacz/ }),
    ).not.toBeInTheDocument();

    // A closed window without entries has nothing to lead back to.
    expect(
      screen.getByRole("button", {
        name: "Pokaż powiadomienia: 1 powiadomienie",
      }),
    ).toBeInTheDocument();
    act(() => useNotificationsStore.getState().clearNotifications());
    expect(
      screen.queryByRole("button", { name: /Pokaż powiadomienia/ }),
    ).not.toBeInTheDocument();
  });
});
