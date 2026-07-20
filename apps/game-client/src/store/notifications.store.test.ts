import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type NotificationPresentation,
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

const presentNotification = (
  notification:
    | NotificationWithServers
    | ReturnType<typeof createPartyGatheringNotification>,
) => {
  useNotificationsStore.getState().presentNotifications([{ notification }]);
};

describe("notifications.store", () => {
  beforeEach(() => {
    vi.useRealTimers();
    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
      latestPresentationStartedEmpty: false,
    });
  });

  it("keeps the newest 50 notifications and evicts their auto-hide state atomically", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T10:00:00.000Z"));

    useNotificationsStore.getState().presentNotifications(
      Array.from({ length: 51 }, (_, index) => ({
        notification: createNotification({
          notificationId: `notification-${index}`,
          message: `Message ${index}`,
        }),
        autoHideDurationMs: 5_000,
      })),
    );

    const { notifications, notificationAutoHideByListKey } =
      useNotificationsStore.getState();

    expect(notifications).toHaveLength(50);
    expect(notifications[0]?.notificationId).toBe("notification-50");
    expect(notifications.at(-1)?.notificationId).toBe("notification-1");
    expect(notificationAutoHideByListKey).not.toHaveProperty("notification-0");
    expect(Object.keys(notificationAutoHideByListKey)).toHaveLength(50);
  });

  it("increments notification cycle when pushing notifications", () => {
    presentNotification(createNotification());
    presentNotification(
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

  it("records atomically whether the latest presentation started from an empty list", () => {
    const publishedStates: Array<{
      latestPresentationStartedEmpty: boolean;
      notificationsCount: number;
    }> = [];
    const unsubscribe = useNotificationsStore.subscribe((state) => {
      publishedStates.push({
        latestPresentationStartedEmpty: state.latestPresentationStartedEmpty,
        notificationsCount: state.notifications.length,
      });
    });

    presentNotification(createNotification());
    presentNotification(
      createNotification({
        notificationId: "notification-2",
      }),
    );
    useNotificationsStore.getState().clearNotifications();
    presentNotification(
      createNotification({
        notificationId: "notification-3",
      }),
    );

    expect(publishedStates).toEqual([
      {
        latestPresentationStartedEmpty: true,
        notificationsCount: 1,
      },
      {
        latestPresentationStartedEmpty: false,
        notificationsCount: 2,
      },
      {
        latestPresentationStartedEmpty: false,
        notificationsCount: 0,
      },
      {
        latestPresentationStartedEmpty: true,
        notificationsCount: 1,
      },
    ]);
    unsubscribe();
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

  it("removes notifications for many npc ids with one publish and cleans their deadlines", () => {
    const createStoredNpcNotification = (
      notificationId: string,
      npcId: number,
      world: string,
    ) => ({
      ...createNotification({
        notificationId,
        message: undefined,
        npc: { id: npcId } as never,
        world,
      }),
      listKey: notificationId,
      receivedAtMs: 1,
    });
    const keptMessage = {
      ...createNotification({ notificationId: "message-1" }),
      listKey: "message-1",
      receivedAtMs: 1,
    };

    useNotificationsStore.setState({
      notifications: [
        createStoredNpcNotification("npc-100-pandora", 100, "pandora"),
        createStoredNpcNotification("npc-200-pandora", 200, "pandora"),
        createStoredNpcNotification("npc-100-gefion", 100, "gefion"),
        keptMessage,
      ],
      notificationAutoHideByListKey: {
        "npc-100-pandora": {
          deadlineMs: 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
        "npc-200-pandora": {
          deadlineMs: 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
        "npc-100-gefion": {
          deadlineMs: 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
        "message-1": {
          deadlineMs: 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
      },
    });
    const listener = vi.fn();
    const unsubscribe = useNotificationsStore.subscribe(listener);

    useNotificationsStore
      .getState()
      .removeNotificationsByNpcIds([100, 200], "pandora");

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["npc-100-gefion", "message-1"]);
    expect(
      Object.keys(
        useNotificationsStore.getState().notificationAutoHideByListKey,
      ),
    ).toEqual(["npc-100-gefion", "message-1"]);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("merges notifications with the same notification id and keeps the original list key", () => {
    presentNotification(
      createNotification({
        notificationId: "notification-1",
        message: "First",
        servers: ["guild-1"],
      }),
    );
    const initialListKey =
      useNotificationsStore.getState().notifications[0]?.listKey;

    presentNotification(
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
    presentNotification(
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

    presentNotification(
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
    presentNotification(
      createPartyGatheringNotification({
        notificationId: "party-1",
      }),
    );
    presentNotification(
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

  it("preserves ordering, identity, server merging, npc dedupe, and party semantics for a mixed batch", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T10:00:00.000Z"));
    const presentations: NotificationPresentation[] = [
      {
        notification: createNotification({
          notificationId: "message-1",
          message: "First",
          servers: ["guild-1"],
        }),
        autoHideDurationMs: 5_000,
      },
      {
        notification: createNotification({
          notificationId: "message-2",
          message: "Second",
        }),
      },
      {
        notification: createNotification({
          notificationId: "message-1",
          message: "Updated",
          servers: ["guild-2"],
        }),
        autoHideDurationMs: 7_000,
      },
      {
        notification: createNotification({
          notificationId: "npc-1",
          message: undefined,
          npc: { id: 500 } as never,
          servers: ["guild-1"],
        }),
      },
      {
        notification: createNotification({
          notificationId: "npc-2",
          message: undefined,
          npc: { id: 500 } as never,
          servers: ["guild-2"],
        }),
      },
      {
        notification: createNotification({
          notificationId: "npc-2",
          message: undefined,
          npc: { id: 500 } as never,
          servers: ["guild-3"],
        }),
      },
      {
        notification: createNotification({
          notificationId: "npc-other-world",
          message: undefined,
          npc: { id: 500 } as never,
          servers: ["guild-4"],
          world: "gefion",
        }),
      },
      {
        notification: createPartyGatheringNotification({
          notificationId: "party-1",
        }),
      },
      {
        notification: createPartyGatheringNotification({
          notificationId: "party-2",
        }),
      },
    ];
    const listener = vi.fn();
    const unsubscribe = useNotificationsStore.subscribe(listener);

    useNotificationsStore.getState().presentNotifications(presentations);

    const { notifications, notificationAutoHideByListKey } =
      useNotificationsStore.getState();
    expect(
      notifications.map(({ listKey, notificationId }) => ({
        listKey,
        notificationId,
      })),
    ).toEqual([
      { listKey: "party-2", notificationId: "party-2" },
      { listKey: "party-1", notificationId: "party-1" },
      {
        listKey: "npc-other-world",
        notificationId: "npc-other-world",
      },
      { listKey: "npc-1", notificationId: "npc-2" },
      { listKey: "message-1", notificationId: "message-1" },
      { listKey: "message-2", notificationId: "message-2" },
    ]);
    expect(
      notifications.find(({ listKey }) => listKey === "message-1"),
    ).toEqual(
      expect.objectContaining({
        message: "Updated",
        servers: ["guild-1", "guild-2"],
      }),
    );
    expect(notifications.find(({ listKey }) => listKey === "npc-1")).toEqual(
      expect.objectContaining({
        servers: ["guild-1", "guild-2", "guild-3"],
      }),
    );
    expect(notificationAutoHideByListKey).toEqual({
      "message-1": {
        deadlineMs: Date.now() + 7_000,
        pausedRemainingMs: null,
        durationMs: 7_000,
      },
    });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
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

  it("removes many notifications and their auto-hide state with one publish", () => {
    useNotificationsStore.setState({
      notifications: [
        {
          ...createNotification({ notificationId: "notification-1" }),
          listKey: "notification-1",
          receivedAtMs: 1,
        },
        {
          ...createNotification({ notificationId: "notification-2" }),
          listKey: "notification-2",
          receivedAtMs: 2,
        },
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
        "notification-2": {
          deadlineMs: 2_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
      },
    });
    const listener = vi.fn();
    const unsubscribe = useNotificationsStore.subscribe(listener);

    useNotificationsStore
      .getState()
      .removeNotifications(["notification-1", "notification-2"]);

    expect(useNotificationsStore.getState().notifications).toEqual([]);
    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey,
    ).toEqual({});
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("does not publish when removing a notification that does not exist", () => {
    const listener = vi.fn();
    const unsubscribe = useNotificationsStore.subscribe(listener);
    const stateBefore = useNotificationsStore.getState();

    useNotificationsStore.getState().removeNotification("missing");

    expect(useNotificationsStore.getState()).toBe(stateBefore);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not publish when clearing missing auto-hide state", () => {
    const listener = vi.fn();
    const unsubscribe = useNotificationsStore.subscribe(listener);
    const stateBefore = useNotificationsStore.getState();

    useNotificationsStore
      .getState()
      .clearNotificationAutoHide("notification-1");

    expect(useNotificationsStore.getState()).toBe(stateBefore);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not publish invalid auto-hide transitions", () => {
    const listener = vi.fn();
    const unsubscribe = useNotificationsStore.subscribe(listener);
    const stateBefore = useNotificationsStore.getState();

    useNotificationsStore.getState().pauseNotificationAutoHide("missing");
    useNotificationsStore.getState().resumeNotificationAutoHide("missing");
    useNotificationsStore.getState().setNotificationAutoHide("missing", 0);

    expect(useNotificationsStore.getState()).toBe(stateBefore);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not publish when clearing an already empty notification store", () => {
    const listener = vi.fn();
    const unsubscribe = useNotificationsStore.subscribe(listener);
    const stateBefore = useNotificationsStore.getState();

    useNotificationsStore.getState().clearNotifications();

    expect(useNotificationsStore.getState()).toBe(stateBefore);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
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
