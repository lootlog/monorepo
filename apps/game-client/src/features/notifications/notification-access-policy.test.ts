import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { useNotificationsStore } from "@/store/notifications.store";
import {
  canReadNotification,
  reconcileNotificationAccess,
} from "./notification-access-policy";

const snapshot = () =>
  createAccessPolicySnapshot(
    [
      {
        guild: { id: "b", ownerId: "owner" },
        roles: [
          {
            permissions: [
              Permission.LOOTLOG_NOTIFICATIONS_READ,
              Permission.LOOTLOG_CHAT_READ,
            ],
            lvlRangeFrom: 50,
            lvlRangeTo: 100,
          },
        ],
      },
    ],
    "reader",
  );
afterEach(() => useNotificationsStore.getState().clearNotifications());
it("removes only revoked sources of grouped notifications without replaying their animations", () => {
  useNotificationsStore.getState().presentNotifications([
    {
      notification: {
        notificationId: "grouped",
        guildId: "a",
        servers: ["a", "b"],
        discordId: "sender",
        world: "alpha",
        createdAt: "2026-09-07T00:00:00Z",
        message: "grouped",
      },
      autoHideDurationMs: 5000,
    },
    {
      notification: {
        notificationId: "removed",
        guildId: "a",
        servers: ["a"],
        discordId: "sender",
        world: "alpha",
        createdAt: "2026-09-07T00:00:00Z",
        message: "removed",
      },
      autoHideDurationMs: 5000,
    },
  ]);
  const animation =
    useNotificationsStore.getState().latestNotificationAnimationCycle;
  reconcileNotificationAccess(snapshot());
  const state = useNotificationsStore.getState();
  expect(state.notifications).toHaveLength(1);
  expect(state.notifications[0]).toMatchObject({
    notificationId: "grouped",
    guildId: "b",
    servers: ["b"],
  });
  expect(state.notificationAutoHideByListKey.removed).toBeUndefined();
  expect(state.notificationAutoHideByListKey.grouped).toBeDefined();
  expect(state.latestNotificationAnimationCycle).toBe(animation);
  reconcileNotificationAccess(snapshot());
  expect(useNotificationsStore.getState().notifications).toBe(
    state.notifications,
  );
});
it("applies the server's NPC tier and level rules to numeric game NPC types", () => {
  const policy = snapshot();
  expect(
    canReadNotification(policy, {
      guildId: "b",
      npc: { type: 2, wt: 100, lvl: 80, prof: "w" },
    }),
  ).toBe(false);
  expect(
    canReadNotification(policy, {
      guildId: "b",
      npc: { type: 2, wt: 20, lvl: 80, prof: "w" },
    }),
  ).toBe(true);
  expect(
    canReadNotification(policy, {
      guildId: "b",
      npc: { type: 2, wt: 20, lvl: 101, prof: "w" },
    }),
  ).toBe(false);
  expect(canReadNotification(policy, { guildId: "a" })).toBe(false);
});

it("removes a stored titan mention when chat tier access is revoked", () => {
  useNotificationsStore.getState().presentNotifications([
    {
      notification: {
        type: "chat-mention",
        notificationId: "titan-mention",
        guildId: "b",
        servers: ["b"],
        discordId: "sender",
        world: "alpha",
        createdAt: "2026-09-07T00:00:00Z",
        message: "NPC message",
        sourceNpc: { type: "TITAN", lvl: 80 },
      },
    },
  ]);
  reconcileNotificationAccess(snapshot());
  expect(useNotificationsStore.getState().notifications).toEqual([]);
});
