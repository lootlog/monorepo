import { resolveNpcType } from "@lootlog/domain/npc-routing";
import {
  canReadPolicyNpc,
  type AccessPolicySnapshot,
} from "@lootlog/protocol/realtime/access-policy";
import { useNotificationsStore } from "@/store/notifications.store";

type NotificationSource = {
  guildId: string;
  type?: string;
  sourceNpc?: { type: string; lvl: number } | null;
  npc?: { type: string | number; lvl: number; wt: number; prof?: string };
};

export const canReadNotification = (
  policy: AccessPolicySnapshot | undefined,
  notification: NotificationSource,
): boolean => {
  if (!policy) return true;
  const organization = policy.organizations.find(
    (entry) => entry.organizationId === notification.guildId,
  );
  if (!organization) return false;
  const area = notification.type === "chat-mention" ? "chat" : "notifications";
  if (notification.type === "chat-mention") {
    // Null identifies a verified plain message; an absent source is an old or unknown entry.
    if (notification.sourceNpc === undefined) return false;
    return canReadPolicyNpc(organization, "chat", notification.sourceNpc);
  }
  if (!notification.npc) return canReadPolicyNpc(organization, area, null);
  const type = resolveNpcType(notification.npc);
  return (
    type !== null &&
    canReadPolicyNpc(organization, area, { type, lvl: notification.npc.lvl })
  );
};

export const reconcileNotificationAccess = (policy: AccessPolicySnapshot) => {
  useNotificationsStore.setState((state) => {
    const notifications = state.notifications.flatMap((notification) => {
      const servers = notification.servers.filter((guildId) =>
        canReadNotification(policy, { ...notification, guildId }),
      );
      if (servers.length === 0) return [];
      if (servers.length === notification.servers.length) return [notification];
      // A grouped entry must no longer retain the removed organization as its source.
      return [
        {
          ...notification,
          servers,
          guildId: servers.includes(notification.guildId)
            ? notification.guildId
            : servers[0],
        },
      ];
    });
    if (
      notifications.length === state.notifications.length &&
      notifications.every(
        (entry, index) => entry === state.notifications[index],
      )
    )
      return state;
    const keys = new Set(notifications.map((entry) => entry.listKey));
    return {
      notifications,
      notificationAutoHideByListKey: Object.fromEntries(
        Object.entries(state.notificationAutoHideByListKey).filter(([key]) =>
          keys.has(key),
        ),
      ),
    };
  });
};
