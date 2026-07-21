import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { QuickAccess } from "./quick-access";

vi.mock("@/features/quick-access/components/quick-access-button", () => ({
  QuickAccessButton: ({ id, title }: { id: string; title: string }) => (
    <button
      onClick={() => useWindowsStore.getState().toggleOpen(id as "event-mode")}
      type="button"
    >
      {title}
    </button>
  ),
}));

vi.mock("@/features/quick-access/components/guild-list-popover", () => ({
  GuildListPopover: () => <button type="button">Guild list</button>,
}));

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
    render(<QuickAccess hasActiveEventMode={false} />);

    expect(screen.getByText("Lootlog")).toBeInTheDocument();
    expect(screen.getByText("Timery")).toBeInTheDocument();
    expect(
      document.querySelector("[data-ll-window-resize-handle]"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-ll-quick-access-horizontal-scroll]"),
    ).toBeInTheDocument();
    const scrollViewport = document.querySelector(
      "[data-ll-native-scroll-area]",
    );

    expect(scrollViewport).toBeInTheDocument();
    expect(scrollViewport).toHaveClass(
      "ll:overflow-x-auto",
      "ll:overflow-y-hidden",
    );
  });

  it("does not render when quick access is closed", () => {
    useWindowsStore.setState((state) => ({
      ...state,
      "quick-access": {
        ...state["quick-access"],
        open: false,
      },
    }));

    render(<QuickAccess hasActiveEventMode={false} />);

    expect(screen.queryByText("Lootlog")).not.toBeInTheDocument();
  });

  it("shows Event Mode only for an active event and reopens its window", () => {
    useWindowsStore.getState().setOpen("event-mode", false);
    const { rerender } = render(<QuickAccess hasActiveEventMode={false} />);

    expect(screen.queryByText("Tryb wydarzenia")).not.toBeInTheDocument();

    rerender(<QuickAccess hasActiveEventMode />);
    fireEvent.click(screen.getByRole("button", { name: "Tryb wydarzenia" }));

    expect(useWindowsStore.getState()["event-mode"].open).toBe(true);
  });

  it("keeps the user-defined size when a conditional button appears", () => {
    useWindowsStore
      .getState()
      .setSize("quick-access", { width: 340, height: 84 });
    const { rerender } = render(<QuickAccess hasActiveEventMode={false} />);
    const quickAccessWindow = document.querySelector<HTMLElement>(
      '[data-ll-draggable-window="quick-access"]',
    );

    expect(quickAccessWindow?.style.width).toBe("340px");
    expect(quickAccessWindow?.style.height).toBe("84px");

    rerender(<QuickAccess hasActiveEventMode />);

    expect(quickAccessWindow?.style.width).toBe("340px");
    expect(quickAccessWindow?.style.height).toBe("84px");
  });
});
