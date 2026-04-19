import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useNotifications } from "./use-notifications";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import type * as LootlogTypesModule from "@lootlog/types";

const mockUseSocket = vi.fn();
const mockUseSession = vi.fn();
const mockUseCurrentGameAccountNotificationSettings = vi.fn();
const mockUseCurrentUserNotificationMutes = vi.fn();
const mockIsNotificationMuted = vi.fn();
const mockGetNpcTypeByWt = vi.fn();
const mockPlaySound = vi.fn();

const socketHandlers = new Map<string, (data: unknown) => void>();
const socket = {
  on: vi.fn((event: string, handler: (data: unknown) => void) => {
    socketHandlers.set(event, handler);
  }),
  off: vi.fn((event: string, handler: (data: unknown) => void) => {
    const currentHandler = socketHandlers.get(event);
    if (currentHandler === handler) {
      socketHandlers.delete(event);
    }
  }),
};

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => mockUseSocket(),
}));

vi.mock("@/hooks/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("@/hooks/use-current-game-account-notification-settings", () => ({
  useCurrentGameAccountNotificationSettings: () =>
    mockUseCurrentGameAccountNotificationSettings(),
}));

vi.mock("@/hooks/use-current-user-notification-mutes", () => ({
  useCurrentUserNotificationMutes: () => mockUseCurrentUserNotificationMutes(),
}));

vi.mock("@/features/notifications/utils/notification-mutes", () => ({
  isNotificationMuted: (...args: unknown[]) => mockIsNotificationMuted(...args),
}));

vi.mock("@lootlog/types", async (importOriginal) => {
  const originalModule = await importOriginal<typeof LootlogTypesModule>();
  return {
    ...originalModule,
    getNpcTypeByWt: (...args: unknown[]) => mockGetNpcTypeByWt(...args),
  };
});

vi.mock("@/hooks/use-sound-playback", () => ({
  useSoundPlayback: () => ({
    playSound: (...args: unknown[]) => mockPlaySound(...args),
  }),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getWorldName: () => "pandora",
  },
}));

const createMessageNotification = (index: number = 1) => ({
  notificationId: `notification-${index}`,
  discordId: `discord-${index}`,
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-19T10:00:00.000Z",
  message: `Hej ${index}`,
});

const createNpcNotification = (overrides?: {
  notificationId?: string;
  guildId?: string;
  world?: string;
  discordId?: string;
}) => ({
  notificationId: overrides?.notificationId ?? "npc-1",
  discordId: overrides?.discordId ?? "discord-npc",
  guildId: overrides?.guildId ?? "guild-1",
  world: overrides?.world ?? "pandora",
  createdAt: "2026-04-19T10:00:00.000Z",
  npc: {
    id: 500,
    nick: "Npc",
    name: "Npc",
    x: 10,
    y: 20,
    tpl: 900,
    icon: "npc.gif",
    prof: "m",
    wt: 80,
    lvl: 230,
    type: 3,
    location: "Ithan",
  },
});

describe("useNotifications", () => {
  let currentNotificationSettings: ReturnType<
    typeof mockUseCurrentGameAccountNotificationSettings
  >;
  let currentNotificationMutes: ReturnType<
    typeof mockUseCurrentUserNotificationMutes
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();

    currentNotificationSettings = {
      accountId: "account-1",
      isReady: true,
      settings: {
        message: {
          show: true,
          ignoreOtherWorlds: false,
          guildIds: ["guild-1"],
          sound: false,
        },
        HERO: {
          show: true,
          ignoreOtherWorlds: false,
          guildIds: ["guild-1"],
          sound: true,
        },
      },
    };
    currentNotificationMutes = {
      isReady: true,
      mutes: {
        players: [],
        npcs: [],
      },
    };

    mockUseSocket.mockReturnValue({
      connected: true,
      socket,
    });
    mockUseSession.mockReturnValue({
      data: {
        user: {
          discordId: "self-discord-id",
        },
      },
    });
    mockUseCurrentGameAccountNotificationSettings.mockImplementation(
      () => currentNotificationSettings,
    );
    mockUseCurrentUserNotificationMutes.mockImplementation(
      () => currentNotificationMutes,
    );
    mockIsNotificationMuted.mockReturnValue(false);
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
    });
    useWindowsStore.setState((state) => ({
      ...state,
      notifications: {
        ...state.notifications,
        open: false,
      },
    }));
  });

  it("subscribes to notification socket events and unsubscribes on cleanup", () => {
    const { unmount } = renderHook(() => useNotifications());

    expect(socket.on).toHaveBeenCalledWith(
      GatewayEvent.NOTIFICATION,
      expect.any(Function),
    );

    const handler = socketHandlers.get(GatewayEvent.NOTIFICATION);
    unmount();

    expect(socket.off).toHaveBeenCalledWith(GatewayEvent.NOTIFICATION, handler);
  });

  it("queues notifications until settings and mutes are ready, then flushes them", () => {
    currentNotificationSettings.isReady = false;
    currentNotificationMutes.isReady = false;

    const { rerender } = renderHook(() => useNotifications());

    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.(
        createMessageNotification(),
      );
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);

    currentNotificationSettings.isReady = true;
    currentNotificationMutes.isReady = true;
    rerender();

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({
        notificationId: "notification-1",
        servers: ["guild-1"],
      }),
    ]);
    expect(useWindowsStore.getState().notifications.open).toBe(true);
  });

  it("clears pending notifications when the account changes before readiness", () => {
    currentNotificationSettings.isReady = false;
    currentNotificationMutes.isReady = false;

    const { rerender } = renderHook(() => useNotifications());

    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.(
        createMessageNotification(),
      );
    });

    currentNotificationSettings = {
      ...currentNotificationSettings,
      accountId: "account-2",
    };
    rerender();

    currentNotificationSettings.isReady = true;
    currentNotificationMutes.isReady = true;
    rerender();

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("keeps only the latest 100 pending notifications", () => {
    currentNotificationSettings.isReady = false;
    currentNotificationMutes.isReady = false;

    const { rerender } = renderHook(() => useNotifications());

    act(() => {
      for (let index = 0; index < 101; index += 1) {
        socketHandlers.get(GatewayEvent.NOTIFICATION)?.(
          createMessageNotification(index),
        );
      }
    });

    currentNotificationSettings.isReady = true;
    currentNotificationMutes.isReady = true;
    rerender();

    expect(useNotificationsStore.getState().notifications).toHaveLength(100);
    expect(
      useNotificationsStore
        .getState()
        .notifications.some(
          (notification) => notification.notificationId === "notification-0",
        ),
    ).toBe(false);
  });

  it("ignores own, muted and filtered notifications", () => {
    renderHook(() => useNotifications());

    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.(
        createMessageNotification(),
      );
    });

    expect(useNotificationsStore.getState().notifications).toHaveLength(1);
    useNotificationsStore.getState().clearNotifications();

    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.(
        createMessageNotification(2),
      );
    });

    expect(useNotificationsStore.getState().notifications).toHaveLength(1);
    useNotificationsStore.getState().clearNotifications();

    mockIsNotificationMuted.mockReturnValue(true);
    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.({
        ...createMessageNotification(3),
        discordId: "discord-muted",
      });
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);
    mockIsNotificationMuted.mockReturnValue(false);

    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.({
        ...createMessageNotification(4),
        discordId: "self-discord-id",
      });
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);

    currentNotificationSettings.settings.message = {
      show: true,
      ignoreOtherWorlds: true,
      guildIds: ["guild-1"],
      sound: false,
    };

    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.({
        ...createMessageNotification(5),
        world: "orvidia",
      });
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);

    currentNotificationSettings.settings.message = {
      show: false,
      ignoreOtherWorlds: false,
      guildIds: ["guild-1"],
      sound: false,
    };

    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.(
        createMessageNotification(6),
      );
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("pushes allowed npc notifications and plays sound when the type has sound enabled", () => {
    renderHook(() => useNotifications());

    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.(createNpcNotification());
    });

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({
        notificationId: "npc-1",
        servers: ["guild-1"],
      }),
    ]);
    expect(useWindowsStore.getState().notifications.open).toBe(true);
    expect(mockPlaySound).toHaveBeenCalledWith("notifications", "HERO");
  });

  it("still shows notifications when the type has no settings, but skips sound", () => {
    mockGetNpcTypeByWt.mockReturnValue("UNKNOWN");

    renderHook(() => useNotifications());

    act(() => {
      socketHandlers.get(GatewayEvent.NOTIFICATION)?.(
        createNpcNotification({
          notificationId: "npc-unknown",
        }),
      );
    });

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({
        notificationId: "npc-unknown",
      }),
    ]);
    expect(useWindowsStore.getState().notifications.open).toBe(true);
    expect(mockPlaySound).not.toHaveBeenCalled();
  });
});
