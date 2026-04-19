import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Notifications } from "./notifications";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";

const mockUseNotifications = vi.fn();
const mockUseVisibleNotifications = vi.fn();
const mockNotificationsList = vi.fn();

vi.mock("@/features/notifications/hooks/use-notifications", () => ({
  useNotifications: () => mockUseNotifications(),
}));

vi.mock("@/features/notifications/hooks/use-visible-notifications", () => ({
  useVisibleNotifications: (...args: unknown[]) =>
    mockUseVisibleNotifications(...args),
}));

vi.mock("@/features/notifications/components/notifications-list", () => ({
  NotificationsList: ({
    notifications,
  }: {
    notifications: Array<{ notificationId: string }>;
  }) => {
    mockNotificationsList(notifications);

    return (
      <div data-testid="notifications-list">
        {notifications
          .map((notification) => notification.notificationId)
          .join(",")}
      </div>
    );
  },
}));

vi.mock("@/components/animated-window", () => ({
  AnimatedWindow: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (
    <div data-testid="animated-window" data-open={String(isOpen)}>
      {isOpen ? children : null}
    </div>
  ),
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    children,
    onClose,
    onMaxContentHeightChange,
    actions,
  }: {
    children: React.ReactNode;
    onClose: () => void;
    onMaxContentHeightChange?: (nextMaxContentHeight: number) => void;
    actions?: React.ReactNode;
  }) => (
    <div data-testid="draggable-window">
      <button type="button" onClick={onClose}>
        close
      </button>
      <button type="button" onClick={() => onMaxContentHeightChange?.(420)}>
        change-max-height
      </button>
      {actions}
      {children}
    </div>
  ),
}));

vi.mock("@/components/window-max-height-action", () => ({
  WindowMaxHeightAction: ({
    currentMaxHeight,
  }: {
    currentMaxHeight: number;
  }) => <div data-testid="window-max-height-action">{currentMaxHeight}</div>,
}));

describe("Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseVisibleNotifications.mockReturnValue({
      notifications: [],
    });

    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
    });
    useWindowsStore.setState((state) => ({
      ...state,
      notifications: {
        ...state.notifications,
        open: true,
        maxContentHeight: undefined,
        size: { width: 360, height: 300 },
      },
    }));
  });

  it("subscribes to notifications and renders the window only when it is open and visible notifications exist", () => {
    mockUseVisibleNotifications.mockReturnValue({
      notifications: [
        {
          notificationId: "notification-1",
        },
      ],
    });

    render(<Notifications />);

    expect(mockUseNotifications).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("animated-window")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByTestId("notifications-list")).toHaveTextContent(
      "notification-1",
    );
    expect(mockNotificationsList).toHaveBeenCalledWith([
      expect.objectContaining({
        notificationId: "notification-1",
      }),
    ]);
  });

  it("does not render the window content when there are no visible notifications", () => {
    render(<Notifications />);

    expect(screen.getByTestId("animated-window")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByTestId("draggable-window")).not.toBeInTheDocument();
  });

  it("closes the window and clears stored notifications", () => {
    mockUseVisibleNotifications.mockReturnValue({
      notifications: [
        {
          notificationId: "notification-1",
        },
      ],
    });
    useNotificationsStore.setState({
      notifications: [
        {
          notificationId: "notification-1",
          discordId: "discord-1",
          guildId: "guild-1",
          world: "pandora",
          createdAt: "2026-04-19T10:00:00.000Z",
          message: "Hej",
          servers: ["guild-1"],
          listKey: "notification-1",
          receivedAtMs: Date.now(),
        },
      ],
      notificationAutoHideByListKey: {},
    });

    render(<Notifications />);

    fireEvent.click(screen.getByRole("button", { name: "close" }));

    expect(useWindowsStore.getState().notifications.open).toBe(false);
    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("syncs max height state with the stored max content height and persists updates", async () => {
    mockUseVisibleNotifications.mockReturnValue({
      notifications: [
        {
          notificationId: "notification-1",
        },
      ],
    });

    render(<Notifications />);

    expect(screen.getByTestId("window-max-height-action")).toHaveTextContent(
      "300",
    );

    act(() => {
      useWindowsStore.getState().setMaxContentHeight("notifications", 180);
    });

    await waitFor(() => {
      expect(screen.getByTestId("window-max-height-action")).toHaveTextContent(
        "180",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "change-max-height" }));

    expect(useWindowsStore.getState().notifications.maxContentHeight).toBe(420);
  });
});
