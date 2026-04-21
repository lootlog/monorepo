import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type NotificationWithServers,
  useNotificationsStore,
} from "./notifications.store";

const createNotification = (
  overrides?: Partial<NotificationWithServers>,
): NotificationWithServers => ({
  notificationId: "notification-1",
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-17T10:00:00.000Z",
  message: "Hej",
  servers: ["guild-1"],
  ...overrides,
});

const createPartyGatheringNotification = (overrides?: {
  notificationId?: string;
  guildId?: string;
  world?: string;
}) => ({
  notificationId: overrides?.notificationId ?? "party-1",
  guildId: overrides?.guildId ?? "guild-1",
  discordId: "discord-7",
  world: overrides?.world ?? "pandora",
  createdAt: "2026-04-17T10:00:00.000Z",
  character: {
    nick: "Hero",
    lvl: 120,
    prof: "w",
    characterId: "100",
    accountId: "200",
    icon: "hero.gif",
  },
  servers: ["guild-1"],
  type: "party-gathering" as const,
});

describe("notifications.store", () => {
  beforeEach(() => {
    vi.useRealTimers();
    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
    });
  });

  it("increments notification cycle when pushing notifications", () => {
    useNotificationsStore.getState().pushNotification(createNotification());
    useNotificationsStore.getState().pushNotification(
      createNotification({
        notificationId: "notification-2",
        message: "Siema",
      }),
    );

    const { notifications, latestNotificationAnimationCycle } =
      useNotificationsStore.getState();

    expect(
      notifications.map((notification) => notification.notificationId),
    ).toEqual(["notification-2", "notification-1"]);
    expect(latestNotificationAnimationCycle).toBe(2);
  });

  it("removes matching npc notifications together with their auto-hide state", () => {
    useNotificationsStore.setState({
      notifications: [
        {
          ...createNotification({
            notificationId: "notification-1",
            message: undefined,
            npc: {
              id: 500,
            } as never,
          }),
          listKey: "notification-1",
          receivedAtMs: 1,
        },
        {
          ...createNotification({
            notificationId: "notification-2",
            message: "Hej",
          }),
          listKey: "notification-2",
          receivedAtMs: 2,
        },
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: 1000,
          pausedRemainingMs: null,
          durationMs: 1000,
        },
        "notification-2": {
          deadlineMs: 2000,
          pausedRemainingMs: null,
          durationMs: 1000,
        },
      },
      latestNotificationAnimationCycle: 7,
    });

    useNotificationsStore.getState().removeNotificationByNpcId(500, "pandora");

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({
        notificationId: "notification-2",
      }),
    ]);
    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey,
    ).toEqual({
      "notification-2": {
        deadlineMs: 2000,
        pausedRemainingMs: null,
        durationMs: 1000,
      },
    });
    expect(
      useNotificationsStore.getState().latestNotificationAnimationCycle,
    ).toBe(7);
  });

  it("merges notifications with the same notification id and keeps the original list key", () => {
    useNotificationsStore.getState().pushNotification(
      createNotification({
        notificationId: "notification-1",
        message: "First",
        servers: ["guild-1"],
      }),
    );
    const initialListKey =
      useNotificationsStore.getState().notifications[0]?.listKey;

    useNotificationsStore.getState().pushNotification(
      createNotification({
        notificationId: "notification-1",
        message: "Updated",
        servers: ["guild-2"],
      }),
    );

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({
        notificationId: "notification-1",
        message: "Updated",
        listKey: initialListKey,
        servers: ["guild-1", "guild-2"],
      }),
    ]);
  });

  it("merges npc notifications by npc id and world", () => {
    useNotificationsStore.getState().pushNotification(
      createNotification({
        notificationId: "notification-1",
        message: undefined,
        servers: ["guild-1"],
        npc: {
          id: 500,
        } as never,
      }),
    );
    const initialListKey =
      useNotificationsStore.getState().notifications[0]?.listKey;

    useNotificationsStore.getState().pushNotification(
      createNotification({
        notificationId: "notification-2",
        message: undefined,
        servers: ["guild-2"],
        npc: {
          id: 500,
        } as never,
      }),
    );

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({
        notificationId: "notification-2",
        listKey: initialListKey,
        servers: ["guild-1", "guild-2"],
      }),
    ]);
  });

  it("does not merge party gathering notifications by world or guild", () => {
    useNotificationsStore.getState().pushNotification(
      createPartyGatheringNotification({
        notificationId: "party-1",
      }),
    );
    useNotificationsStore.getState().pushNotification(
      createPartyGatheringNotification({
        notificationId: "party-2",
      }),
    );

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["party-2", "party-1"]);
  });

  it("removes a notification together with its auto-hide state", () => {
    useNotificationsStore.setState({
      notifications: [
        {
          ...createNotification({
            notificationId: "notification-1",
          }),
          listKey: "notification-1",
          receivedAtMs: 1,
        },
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: 1500,
          pausedRemainingMs: null,
          durationMs: 1000,
        },
      },
    });

    useNotificationsStore.getState().removeNotification("notification-1");

    expect(useNotificationsStore.getState().notifications).toEqual([]);
    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey,
    ).toEqual({});
  });

  it("manages notification auto-hide lifecycle", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T10:00:00.000Z"));

    const listKey = "notification-1";

    useNotificationsStore.getState().setNotificationAutoHide(listKey, 5000);
    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey[listKey],
    ).toEqual({
      deadlineMs: Date.now() + 5000,
      pausedRemainingMs: null,
      durationMs: 5000,
    });

    vi.setSystemTime(new Date("2026-04-17T10:00:02.000Z"));
    useNotificationsStore.getState().pauseNotificationAutoHide(listKey);

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey[listKey],
    ).toEqual({
      deadlineMs: null,
      pausedRemainingMs: 3000,
      durationMs: 5000,
    });

    vi.setSystemTime(new Date("2026-04-17T10:00:03.000Z"));
    useNotificationsStore.getState().resumeNotificationAutoHide(listKey);

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey[listKey],
    ).toEqual({
      deadlineMs: Date.now() + 3000,
      pausedRemainingMs: null,
      durationMs: 5000,
    });

    useNotificationsStore.getState().clearNotificationAutoHide(listKey);

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey,
    ).toEqual({});
  });
});
