import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type NotificationWithServers,
  type PartyGatheringNotification,
  useNotificationsStore,
} from "./notifications.store";

const createMessageNotification = (
  overrides?: Partial<NotificationWithServers>,
): NotificationWithServers => ({
  notificationId: "notification-1",
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-19T10:00:00.000Z",
  message: "Hej",
  servers: ["guild-1"],
  ...overrides,
});

const createNpcNotification = (
  overrides?: Partial<NotificationWithServers>,
): NotificationWithServers => ({
  notificationId: "notification-1",
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
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
  servers: ["guild-1"],
  ...overrides,
});

const createPartyGatheringNotification = (
  overrides?: Partial<PartyGatheringNotification>,
): PartyGatheringNotification => ({
  type: "party-gathering",
  notificationId: "party-1",
  guildId: "guild-1",
  discordId: "discord-1",
  world: "pandora",
  createdAt: "2026-04-19T10:00:00.000Z",
  servers: ["guild-1"],
  character: {
    nick: "Tester",
    lvl: 230,
    prof: "w",
    characterId: "101",
    accountId: "202",
    icon: "hero.gif",
  },
  ...overrides,
});

describe("useNotificationsStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00.000Z"));
    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
    });
  });

  it("merges notifications with the same notification id and deduplicates servers", () => {
    useNotificationsStore
      .getState()
      .pushNotification(createMessageNotification({ servers: ["guild-1"] }));
    vi.setSystemTime(new Date("2026-04-19T10:00:01.000Z"));
    useNotificationsStore.getState().pushNotification(
      createMessageNotification({
        servers: ["guild-1", "guild-2"],
        message: "Nowa treść",
      }),
    );

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({
        notificationId: "notification-1",
        listKey: "notification-1",
        message: "Nowa treść",
        servers: ["guild-1", "guild-2"],
        receivedAtMs: Date.now(),
      }),
    ]);
    expect(
      useNotificationsStore.getState().latestNotificationAnimationCycle,
    ).toBe(2);
  });

  it("merges npc notifications by npc id and world while keeping the original list key", () => {
    const initialNpc = createNpcNotification();

    useNotificationsStore.getState().pushNotification(
      createNpcNotification({
        notificationId: "npc-1",
        servers: ["guild-1"],
      }),
    );
    vi.setSystemTime(new Date("2026-04-19T10:00:01.000Z"));
    useNotificationsStore.getState().pushNotification(
      createNpcNotification({
        notificationId: "npc-2",
        servers: ["guild-2"],
        npc: {
          ...initialNpc.npc,
          name: "Npc po merge",
        },
      }),
    );

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({
        notificationId: "npc-2",
        listKey: "npc-1",
        servers: ["guild-1", "guild-2"],
        npc: expect.objectContaining({
          id: 500,
          name: "Npc po merge",
        }),
      }),
    ]);
  });

  it("keeps message notifications separate and party gathering separate from regular notifications", () => {
    useNotificationsStore
      .getState()
      .pushNotification(
        createMessageNotification({ notificationId: "message-1" }),
      );
    useNotificationsStore
      .getState()
      .pushNotification(
        createMessageNotification({ notificationId: "message-2" }),
      );
    useNotificationsStore
      .getState()
      .pushNotification(createPartyGatheringNotification());

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["party-1", "message-2", "message-1"]);
  });

  it("removes notification auto-hide state when removing by notification id", () => {
    useNotificationsStore.setState({
      notifications: [
        {
          ...createMessageNotification(),
          listKey: "notification-1",
          receivedAtMs: Date.now(),
        },
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: Date.now() + 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
      },
    });

    useNotificationsStore.getState().removeNotification("notification-1");

    expect(useNotificationsStore.getState().notifications).toEqual([]);
    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey,
    ).toEqual({});
  });

  it("removes matching npc notifications by npc id and world without touching party gathering", () => {
    useNotificationsStore.setState({
      notifications: [
        {
          ...createNpcNotification({
            notificationId: "npc-1",
            world: "pandora",
          }),
          listKey: "npc-1",
          receivedAtMs: Date.now(),
        },
        {
          ...createNpcNotification({
            notificationId: "npc-2",
            world: "orvidia",
          }),
          listKey: "npc-2",
          receivedAtMs: Date.now(),
        },
        {
          ...createPartyGatheringNotification(),
          listKey: "party-1",
          receivedAtMs: Date.now(),
        },
      ],
      notificationAutoHideByListKey: {
        "npc-1": {
          deadlineMs: Date.now() + 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
        "npc-2": {
          deadlineMs: Date.now() + 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
        "party-1": {
          deadlineMs: Date.now() + 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
      },
    });

    useNotificationsStore.getState().removeNotificationByNpcId(500, "pandora");

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["npc-2", "party-1"]);
    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey,
    ).toEqual({
      "npc-2": expect.any(Object),
      "party-1": expect.any(Object),
    });
  });

  it("manages auto-hide deadline, pause, resume and clear operations", () => {
    useNotificationsStore.getState().setNotificationAutoHide("list-1", 2_000);

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey["list-1"],
    ).toEqual({
      deadlineMs: Date.now() + 2_000,
      pausedRemainingMs: null,
      durationMs: 2_000,
    });

    vi.setSystemTime(new Date("2026-04-19T10:00:01.000Z"));
    useNotificationsStore.getState().pauseNotificationAutoHide("list-1");

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey["list-1"],
    ).toEqual({
      deadlineMs: null,
      pausedRemainingMs: 1_000,
      durationMs: 2_000,
    });

    vi.setSystemTime(new Date("2026-04-19T10:00:03.000Z"));
    useNotificationsStore.getState().resumeNotificationAutoHide("list-1");

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey["list-1"],
    ).toEqual({
      deadlineMs: Date.now() + 1_000,
      pausedRemainingMs: null,
      durationMs: 2_000,
    });

    useNotificationsStore.getState().clearNotificationAutoHide("list-1");

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey,
    ).toEqual({});
  });

  it("drops auto-hide entries when duration is zero or negative", () => {
    useNotificationsStore.setState({
      notificationAutoHideByListKey: {
        "list-1": {
          deadlineMs: Date.now() + 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
      },
    });

    useNotificationsStore.getState().setNotificationAutoHide("list-1", 0);

    expect(
      useNotificationsStore.getState().notificationAutoHideByListKey,
    ).toEqual({});
  });
});
