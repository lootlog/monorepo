import { render, screen } from "@testing-library/react";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuickAccessButtonProps } from "@/features/quick-access/components/quick-access-button";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { QuickAccess } from "./quick-access";

vi.mock("@/features/quick-access/components/quick-access-button", () => ({
  QuickAccessButton: ({ id, title }: QuickAccessButtonProps) => (
    <button
      onClick={() => {
        if (id !== "lootlog-app") {
          useWindowsStore.getState().toggleOpen(id);
        }
      }}
      type="button"
    >
      {title}
    </button>
  ),
}));

vi.mock("@/features/quick-access/components/guild-list-popover", () => ({
  GuildListPopover: () => <button type="button">Guild list</button>,
}));

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
    usePartyFinderStore.getState().clearReadyRooms();
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
    render(<QuickAccess />);

    expect(screen.getByText("Lootlog")).toBeInTheDocument();
    expect(screen.getByText("Timery")).toBeInTheDocument();
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

    render(<QuickAccess />);

    expect(screen.queryByText("Lootlog")).not.toBeInTheDocument();
  });

  it("keeps the user-defined size when an active Ready Room appears", () => {
    useWindowsStore
      .getState()
      .setSize("quick-access", { width: 340, height: 84 });
    const { rerender } = render(<QuickAccess />);
    const quickAccessWindow = document.querySelector<HTMLElement>(
      '[data-ll-draggable-window="quick-access"]',
    );

    expect(quickAccessWindow?.style.width).toBe("340px");
    expect(quickAccessWindow?.style.height).toBe("84px");

    usePartyFinderStore.setState({
      projections: { [activeReadyRoom.notificationId]: activeReadyRoom },
    });
    rerender(<QuickAccess />);

    expect(screen.getByText("Aktywne zbieranie grupy")).toBeInTheDocument();
    expect(quickAccessWindow?.style.width).toBe("340px");
    expect(quickAccessWindow?.style.height).toBe("84px");
  });
});
