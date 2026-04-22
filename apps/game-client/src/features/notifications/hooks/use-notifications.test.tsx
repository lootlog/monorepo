import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";

const mockOn = vi.fn();
const mockOff = vi.fn();
const mockPushNotification = vi.fn();
const mockSetOpen = vi.fn();
const mockPlaySound = vi.fn();

let notificationSettingsState: {
  accountId: string | null;
  isReady: boolean;
  settings: {
    message: {
      show: boolean;
      ignoreOtherWorlds: boolean;
      guildIds: string[];
      sound: boolean;
    };
  };
};

let notificationMutesState: {
  isReady: boolean;
  mutes: {
    players: [];
    npcs: [];
  };
};

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => ({
    socket: {
      on: mockOn,
      off: mockOff,
    },
    connected: true,
  }),
}));

vi.mock("@/hooks/auth/use-session", () => ({
  useSession: () => ({
    data: {
      user: {
        discordId: "self-discord-id",
      },
    },
  }),
}));

vi.mock("@/hooks/use-current-game-account-notification-settings", () => ({
  useCurrentGameAccountNotificationSettings: () => notificationSettingsState,
}));

vi.mock("@/hooks/use-current-user-notification-mutes", () => ({
  useCurrentUserNotificationMutes: () => notificationMutesState,
}));

vi.mock("@/store/notifications.store", () => ({
  useNotificationsStore: (
    selector: (state: {
      pushNotification: typeof mockPushNotification;
    }) => unknown,
  ) =>
    selector({
      pushNotification: mockPushNotification,
    }),
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: { setOpen: typeof mockSetOpen }) => unknown,
  ) =>
    selector({
      setOpen: mockSetOpen,
    }),
}));

vi.mock("@/hooks/use-sound-playback", () => ({
  useSoundPlayback: () => ({
    playSound: mockPlaySound,
  }),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getWorldName: () => "pandora",
  },
}));

describe("useNotifications", () => {
  beforeEach(() => {
    mockOn.mockReset();
    mockOff.mockReset();
    mockPushNotification.mockReset();
    mockSetOpen.mockReset();
    mockPlaySound.mockReset();

    notificationSettingsState = {
      accountId: null,
      isReady: false,
      settings: {
        message: {
          show: true,
          ignoreOtherWorlds: false,
          guildIds: ["guild-1"],
          sound: false,
        },
      },
    };
    notificationMutesState = {
      isReady: false,
      mutes: {
        players: [],
        npcs: [],
      },
    };
  });

  it("keeps queued notifications across startup account detection", () => {
    const { rerender } = renderHook(() => useNotifications());
    const handler = mockOn.mock.calls.find(
      ([eventName]) => eventName === GatewayEvent.NOTIFICATION,
    )?.[1] as (data: {
      notificationId: string;
      guildId: string;
      discordId: string;
      world: string;
      createdAt: string;
      message: string;
    }) => void;

    handler({
      notificationId: "notification-1",
      guildId: "guild-1",
      discordId: "other-discord-id",
      world: "pandora",
      createdAt: "2026-04-22T10:00:00.000Z",
      message: "test message",
    });

    notificationSettingsState = {
      ...notificationSettingsState,
      accountId: "account-1",
    };
    rerender();

    notificationSettingsState = {
      ...notificationSettingsState,
      isReady: true,
    };
    notificationMutesState = {
      ...notificationMutesState,
      isReady: true,
    };
    rerender();

    expect(mockSetOpen).toHaveBeenCalledWith("notifications", true);
    expect(mockPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: "notification-1",
        servers: ["guild-1"],
      }),
    );
  });
});
