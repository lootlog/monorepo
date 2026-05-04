import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { QuickAccess } from "./quick-access";

vi.mock("@/features/quick-access/components/quick-access-button", () => ({
  QuickAccessButton: ({ title }: { title: string }) => (
    <button type="button">{title}</button>
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
    render(<QuickAccess />);

    expect(screen.getByText("Lootlog")).toBeInTheDocument();
    expect(screen.getByText("Timery")).toBeInTheDocument();
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

  it("closes quick access from the title bar close button", () => {
    const { container } = render(<QuickAccess />);
    const closeButton = container.querySelector('svg[type="button"]');

    expect(closeButton).not.toBeNull();

    fireEvent.click(closeButton as Element);

    expect(useWindowsStore.getState()["quick-access"].open).toBe(false);
  });
});
