import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { usePartyGatheringSocket } from "./use-party-gathering-socket";

const mockOn = vi.fn();
const mockOff = vi.fn();
const mockPushNotification = vi.fn();
const mockRemoveNotification = vi.fn();
const mockSetOpen = vi.fn();
const mockPlaySound = vi.fn();

let notificationSettingsState: {
  accountId: string | null;
  isReady: boolean;
  settings: {
    "party-gathering": {
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

vi.mock("@/hooks/use-sound-playback", () => ({
  useSoundPlayback: () => ({
    playSound: mockPlaySound,
  }),
}));

vi.mock("@/store/notifications.store", () => ({
  useNotificationsStore: (
    selector: (state: {
      pushNotification: typeof mockPushNotification;
      removeNotification: typeof mockRemoveNotification;
    }) => unknown,
  ) =>
    selector({
      pushNotification: mockPushNotification,
      removeNotification: mockRemoveNotification,
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

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {},
    getWorldName: () => "pandora",
  },
}));

describe("usePartyGatheringSocket", () => {
  beforeEach(() => {
    mockOn.mockReset();
    mockOff.mockReset();
    mockPushNotification.mockReset();
    mockRemoveNotification.mockReset();
    mockSetOpen.mockReset();
    mockPlaySound.mockReset();

    notificationSettingsState = {
      accountId: null,
      isReady: false,
      settings: {
        "party-gathering": {
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

  it("keeps queued party gathering notifications across startup account detection", () => {
    const { rerender } = renderHook(() => usePartyGatheringSocket());
    const sendHandler = mockOn.mock.calls.find(
      ([eventName]) => eventName === GatewayEvent.PARTY_GATHERING_SEND,
    )?.[1] as (data: {
      notificationId: string;
      guildId: string;
      discordId: string;
      world: string;
      createdAt: string;
      character: {
        nick: string;
        lvl: number;
        prof: string;
        characterId: string;
        accountId: string;
        icon: string;
      };
      description?: string;
      minLvl?: number;
      maxLvl?: number;
    }) => void;

    sendHandler({
      notificationId: "notification-1",
      guildId: "guild-1",
      discordId: "other-discord-id",
      world: "pandora",
      createdAt: "2026-04-17T10:00:00.000Z",
      character: {
        nick: "Hero",
        lvl: 100,
        prof: "w",
        characterId: "10",
        accountId: "20",
        icon: "hero.gif",
      },
    });

    notificationSettingsState = {
      ...notificationSettingsState,
      accountId: "202",
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

    expect(mockPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: "notification-1",
        servers: ["guild-1"],
        type: "party-gathering",
      }),
    );
  });

  it("caps queued party gathering notifications before readiness", () => {
    const { rerender } = renderHook(() => usePartyGatheringSocket());
    const sendHandler = mockOn.mock.calls.find(
      ([eventName]) => eventName === GatewayEvent.PARTY_GATHERING_SEND,
    )?.[1] as (data: {
      notificationId: string;
      guildId: string;
      discordId: string;
      world: string;
      createdAt: string;
      character: {
        nick: string;
        lvl: number;
        prof: string;
        characterId: string;
        accountId: string;
        icon: string;
      };
    }) => void;

    for (let index = 0; index < 105; index += 1) {
      sendHandler({
        notificationId: `notification-${index}`,
        guildId: "guild-1",
        discordId: `discord-${index}`,
        world: "pandora",
        createdAt: "2026-04-17T10:00:00.000Z",
        character: {
          nick: `Hero ${index}`,
          lvl: 100,
          prof: "w",
          characterId: `${index}`,
          accountId: `${index}`,
          icon: "hero.gif",
        },
      });
    }

    notificationSettingsState = {
      ...notificationSettingsState,
      accountId: "202",
      isReady: true,
    };
    notificationMutesState = {
      ...notificationMutesState,
      isReady: true,
    };

    rerender();

    expect(mockPushNotification).toHaveBeenCalledTimes(100);
    expect(mockPushNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: "notification-0",
      }),
    );
    expect(mockPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: "notification-104",
      }),
    );
  });
});
