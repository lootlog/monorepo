import { createNotificationTest } from "../notification-test";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useVisibleNotifications } from "./use-visible-notifications";

let test: ReturnType<typeof createNotificationTest>;

const createStoredNotification = (
  overrides?: Partial<StoredNotification>,
): StoredNotification => ({
  notificationId: "notification-1",
  discordId: "discord-1",
  guildId: "guild-1",
  world: "luvia",
  createdAt: "2026-04-17T10:00:00.000Z",
  message: "Hej",
  servers: ["guild-1"],
  listKey: "notification-1",
  recentReportIds: ["notification-1"],
  reportCountByGuildId: {},
  receivedAtMs: Date.now(),
  ...overrides,
});

describe("useVisibleNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T10:00:00.000Z"));
    test = createNotificationTest();
    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules cleanup with timeouts instead of interval polling", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    useNotificationsStore.setState({
      notifications: [
        createStoredNotification({
          notificationId: "notification-1",
          listKey: "notification-1",
          recentReportIds: ["notification-1"],
          reportCountByGuildId: {},
          receivedAtMs: Date.now(),
        }),
        createStoredNotification({
          notificationId: "notification-2",
          listKey: "notification-2",
          recentReportIds: ["notification-2"],
          reportCountByGuildId: {},
          receivedAtMs: Date.now(),
        }),
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: Date.now() + 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
        "notification-2": {
          deadlineMs: Date.now() + 2_000,
          pausedRemainingMs: null,
          durationMs: 2_000,
        },
      },
    });

    renderHook(() => useVisibleNotifications({ autoCleanup: true }), {
      wrapper: test.wrapper,
    });

    expect(setIntervalSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(999);
    });

    expect(useNotificationsStore.getState().notifications).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["notification-2"]);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);

    setIntervalSpy.mockRestore();
  });

  it("keeps sweeping when a timer fires before its deadline", () => {
    const deadlineMs = Date.now() + 1_000;

    useNotificationsStore.setState({
      notifications: [
        createStoredNotification({
          notificationId: "notification-1",
          listKey: "notification-1",
          recentReportIds: ["notification-1"],
          reportCountByGuildId: {},
          receivedAtMs: Date.now(),
        }),
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
      },
    });

    renderHook(() => useVisibleNotifications({ autoCleanup: true }), {
      wrapper: test.wrapper,
    });

    // Browsers fire a timeout a fraction of a millisecond early, so the sweep
    // finds nothing expired and the store never changes: without re-arming
    // itself the notification would stay on screen forever.
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(deadlineMs - 1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(useNotificationsStore.getState().notifications).toHaveLength(1);

    nowSpy.mockRestore();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("removes notifications that expired while the tab was hidden on return", () => {
    useNotificationsStore.setState({
      notifications: [createStoredNotification()],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: Date.now() + 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
      },
    });

    renderHook(() => useVisibleNotifications({ autoCleanup: true }), {
      wrapper: test.wrapper,
    });

    // A background tab throttles the timeout well past the deadline, while
    // the row's fade-out has already finished on wall-clock time.
    vi.setSystemTime(Date.now() + 60_000);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("does not auto-remove paused notifications", () => {
    useNotificationsStore.setState({
      notifications: [
        createStoredNotification({
          notificationId: "notification-1",
          listKey: "notification-1",
          recentReportIds: ["notification-1"],
          reportCountByGuildId: {},
          receivedAtMs: Date.now(),
        }),
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: null,
          pausedRemainingMs: 1_000,
          durationMs: 1_000,
        },
      },
    });

    renderHook(() => useVisibleNotifications({ autoCleanup: true }), {
      wrapper: test.wrapper,
    });

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["notification-1"]);
  });

  it("removes an open Hero Tracker entrance when it closes, even while held", () => {
    useNotificationsStore.setState({
      notifications: [
        createStoredNotification({
          message: undefined,
          npc: {
            id: 190436,
            name: "Doświadczony Tropiciel Herosów",
            nick: "Doświadczony Tropiciel Herosów",
            lvl: 282,
            prof: "",
            icon: "npc/tropiciel.gif",
            tpl: 190436,
            wt: 0,
            type: 0,
            x: 17,
            y: 22,
            location: "Jaskinia Piaskowej Burzy s.1",
          },
          heroTracker: {
            state: "open",
            entranceClosesAt: new Date(Date.now() + 60_000).toISOString(),
          },
        }),
      ],
      // The player holds the row: its own countdown is paused.
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: null,
          pausedRemainingMs: 1_000,
          durationMs: 1_000,
        },
      },
    });

    renderHook(() => useVisibleNotifications({ autoCleanup: true }), {
      wrapper: test.wrapper,
    });

    act(() => {
      vi.advanceTimersByTime(59_000);
    });

    expect(useNotificationsStore.getState().notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("falls back to notification timeout when auto-hide state is missing", () => {
    useNotificationsStore.setState({
      notifications: [
        createStoredNotification({
          notificationId: "notification-1",
          listKey: "notification-1",
          recentReportIds: ["notification-1"],
          reportCountByGuildId: {},
          receivedAtMs: Date.now(),
        }),
      ],
      notificationAutoHideByListKey: {},
    });

    renderHook(() => useVisibleNotifications({ autoCleanup: true }), {
      wrapper: test.wrapper,
    });

    act(() => {
      vi.advanceTimersByTime(29_999);
    });

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["notification-1"]);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });

  it("keeps mention notifications visible even when message notifications are hidden", () => {
    test.preferences.notifications.message.show = false;
    test.setPreferences();
    useNotificationsStore.setState({
      notifications: [
        createStoredNotification({
          notificationId: "mention-1",
          listKey: "mention-1",
          recentReportIds: ["mention-1"],
          reportCountByGuildId: {},
          type: "chat-mention",
        }),
      ],
    });

    const { result } = renderHook(() => useVisibleNotifications(), {
      wrapper: test.wrapper,
    });

    expect(result.current.notifications).toEqual([
      expect.objectContaining({
        notificationId: "mention-1",
        type: "chat-mention",
      }),
    ]);
  });
});
