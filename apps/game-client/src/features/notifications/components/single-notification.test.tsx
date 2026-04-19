import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SingleNotification } from "./single-notification";
import {
  useNotificationsStore,
  type NotificationWithServers,
  type PartyGatheringNotification,
  type StoredNotification,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import type * as LootlogTypesModule from "@lootlog/types";

const mockUseCurrentGameAccountNotificationSettings = vi.fn();
const mockUseGuildMembers = vi.fn();
const mockVolunteerMutate = vi.fn();
const mockUseVolunteer = vi.fn();
const mockUseMemberColor = vi.fn();
const mockGetNpcTypeByWt = vi.fn();
const mockAnimate = vi.fn(() => ({
  cancel: vi.fn(),
}));

vi.mock("@/hooks/use-current-game-account-notification-settings", () => ({
  useCurrentGameAccountNotificationSettings: () =>
    mockUseCurrentGameAccountNotificationSettings(),
}));

vi.mock("@/hooks/api/use-guild-members", () => ({
  useGuildMembers: (...args: unknown[]) => mockUseGuildMembers(...args),
}));

vi.mock("@/hooks/api/use-volunteer", () => ({
  useVolunteer: () => mockUseVolunteer(),
}));

vi.mock("@/hooks/api/use-member-invalidation", () => ({
  useMemberInvalidation: () => undefined,
}));

vi.mock("@/hooks/discord/use-member-color", () => ({
  useMemberColor: (...args: unknown[]) => mockUseMemberColor(...args),
}));

vi.mock("@lootlog/types", async (importOriginal) => {
  const originalModule = await importOriginal<typeof LootlogTypesModule>();
  return {
    ...originalModule,
    getNpcTypeByWt: (...args: unknown[]) => mockGetNpcTypeByWt(...args),
  };
});

vi.mock("@/components/character-tile", () => ({
  CharacterTile: () => <div data-testid="character-tile">character</div>,
}));

vi.mock("@/components/npc-tile", () => ({
  NpcTile: () => <div data-testid="npc-tile">npc</div>,
}));

vi.mock("@/features/notifications/components/notification-mute-menu", () => ({
  NotificationMuteMenu: ({
    onOpenChange,
    onMuted,
  }: {
    onOpenChange?: (open: boolean) => void;
    onMuted?: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange?.(true)}>
        open-mute
      </button>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        close-mute
      </button>
      <button type="button" onClick={() => onMuted?.()}>
        mute-now
      </button>
    </div>
  ),
}));

vi.mock(
  "@/features/notifications/components/single-notification-message",
  () => ({
    SingleNotificationMessage: ({
      notification,
    }: {
      notification: NotificationWithServers;
    }) => <div>{`message:${notification.message}`}</div>,
  }),
);

vi.mock("@/features/notifications/components/single-notification-npc", () => ({
  SingleNotificationNpc: ({
    notification,
  }: {
    notification: NotificationWithServers;
  }) => <div>{`npc:${notification.npc?.name}`}</div>,
}));

vi.mock(
  "@/features/notifications/components/single-notification-party-gathering",
  () => ({
    SingleNotificationPartyGathering: ({
      notification,
    }: {
      notification: PartyGatheringNotification;
    }) => <div>{`party:${notification.character.nick}`}</div>,
  }),
);

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      lvl: 230,
    },
  },
}));

const createMessageNotification = (
  overrides?: Partial<NotificationWithServers>,
): NotificationWithServers & { listKey: string; receivedAtMs: number } => ({
  notificationId: "notification-1",
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-19T10:00:00.000Z",
  message: "Hej",
  servers: ["guild-1"],
  listKey: "notification-1",
  receivedAtMs: Date.now(),
  ...overrides,
});

const createNpcNotification = (
  overrides?: Partial<NotificationWithServers>,
): NotificationWithServers & { listKey: string; receivedAtMs: number } => ({
  notificationId: "npc-1",
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-19T10:00:00.000Z",
  servers: ["guild-1"],
  listKey: "npc-1",
  receivedAtMs: Date.now(),
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
  ...overrides,
});

const createPartyNotification = (
  overrides?: Partial<PartyGatheringNotification>,
): PartyGatheringNotification & { listKey: string; receivedAtMs: number } => ({
  type: "party-gathering",
  notificationId: "party-1",
  guildId: "guild-1",
  discordId: "discord-1",
  world: "pandora",
  createdAt: "2026-04-19T10:00:00.000Z",
  servers: ["guild-1"],
  listKey: "party-1",
  receivedAtMs: Date.now(),
  character: {
    nick: "Tester",
    lvl: 240,
    prof: "w",
    characterId: "101",
    accountId: "202",
    icon: "hero.gif",
  },
  ...overrides,
});

describe("SingleNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00.000Z"));

    Object.defineProperty(SVGElement.prototype, "animate", {
      configurable: true,
      value: mockAnimate,
    });

    mockUseCurrentGameAccountNotificationSettings.mockReturnValue({
      settings: {
        message: {
          autoHideTimeout: 0,
          highlight: false,
        },
        HERO: {
          autoHideTimeout: 30,
          highlight: true,
        },
        "party-gathering": {
          autoHideTimeout: 15,
          highlight: false,
        },
      },
    });
    mockUseGuildMembers.mockReturnValue({
      data: {
        "discord-1": {
          userId: "11",
          avatar: "avatar.png",
          name: "Sender",
        },
      },
    });
    mockUseVolunteer.mockReturnValue({
      mutate: mockVolunteerMutate,
      isPending: false,
    });
    mockUseMemberColor.mockReturnValue("abcdef");
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
        open: true,
      },
    }));
  });

  it("renders the message variant and removes a notification from the store", () => {
    const notification = createMessageNotification();
    useNotificationsStore.setState({
      notifications: [notification],
    });

    render(
      <SingleNotification
        guildNamesById={{ "guild-1": "Alpha" }}
        notification={notification}
        showCloseButton
      />,
    );

    expect(screen.getByText("message:Hej")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Zamknij powiadomienie" }),
    );

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("submits volunteer intent for gathering notifications and closes the notifications window", () => {
    const notification = createNpcNotification({
      isGatheringParty: true,
    });
    useNotificationsStore.setState({
      notifications: [notification],
    });

    render(
      <SingleNotification
        guildNamesById={{ "guild-1": "Alpha" }}
        notification={notification}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Idę" }));

    expect(mockVolunteerMutate).toHaveBeenCalledWith({
      notificationId: "npc-1",
      targetDiscordId: "discord-1",
      world: "pandora",
    });
    expect(useWindowsStore.getState().notifications.open).toBe(false);
    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("renders the party gathering action and disables joining when level requirements are not met", () => {
    const notification = createPartyNotification({
      minLvl: 250,
      maxLvl: 260,
    });

    render(
      <SingleNotification
        guildNamesById={{ "guild-1": "Alpha" }}
        notification={notification as StoredNotification}
      />,
    );

    expect(screen.getByText("party:Tester")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dołącz!" })).toBeDisabled();
  });

  it("pauses and resumes auto-hide when the mute menu opens and closes", () => {
    const notification = createNpcNotification();
    useNotificationsStore.setState({
      notifications: [notification],
      notificationAutoHideByListKey: {
        [notification.listKey]: {
          deadlineMs: Date.now() + 30_000,
          pausedRemainingMs: null,
          durationMs: 30_000,
        },
      },
    });

    render(
      <SingleNotification
        guildNamesById={{ "guild-1": "Alpha" }}
        notification={notification}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "open-mute" }));

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey[
        notification.listKey
      ].deadlineMs,
    ).toBeNull();
    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey[
        notification.listKey
      ].pausedRemainingMs,
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "close-mute" }));

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey[
        notification.listKey
      ].deadlineMs,
    ).not.toBeNull();
    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey[
        notification.listKey
      ].pausedRemainingMs,
    ).toBeNull();
  });

  it("removes the notification when the mute menu confirms muting", () => {
    const notification = createNpcNotification();
    useNotificationsStore.setState({
      notifications: [notification],
    });

    render(
      <SingleNotification
        guildNamesById={{ "guild-1": "Alpha" }}
        notification={notification}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "mute-now" }));

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("starts auto-hide and ring animation when the category has a timeout", () => {
    const notification = createNpcNotification();
    useNotificationsStore.setState({
      notifications: [notification],
    });

    render(
      <SingleNotification
        guildNamesById={{ "guild-1": "Alpha" }}
        notification={notification}
      />,
    );

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey[
        notification.listKey
      ],
    ).toEqual({
      deadlineMs: Date.now() + 30_000,
      pausedRemainingMs: null,
      durationMs: 30_000,
    });

    expect(mockAnimate).toHaveBeenCalled();
  });

  it("clears auto-hide state when the category timeout is disabled", () => {
    const notification = createMessageNotification();
    useNotificationsStore.setState({
      notifications: [notification],
      notificationAutoHideByListKey: {
        [notification.listKey]: {
          deadlineMs: Date.now() + 10_000,
          pausedRemainingMs: null,
          durationMs: 10_000,
        },
      },
    });

    render(
      <SingleNotification
        guildNamesById={{ "guild-1": "Alpha" }}
        notification={notification}
      />,
    );

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey,
    ).toEqual({});
  });
});
