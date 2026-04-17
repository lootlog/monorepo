import { beforeEach, describe, expect, it } from "vitest";
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

describe("notifications.store", () => {
  beforeEach(() => {
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
});
