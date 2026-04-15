import type { Notification } from "@/features/notifications/hooks/use-notifications";
import type { PartyGatheringCharacterBase } from "@/types/party-gathering";
import { create } from "zustand";

export type NotificationWithServers = Notification & {
  servers: string[];
};

export type PartyGatheringCharacter = PartyGatheringCharacterBase;

export type PartyGatheringNotification = {
  notificationId: string;
  guildId: string;
  discordId: string;
  world: string;
  createdAt: string;
  character: PartyGatheringCharacter;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  servers: string[];
  type: "party-gathering";
};

export type StoredNotification = (
  | NotificationWithServers
  | PartyGatheringNotification
) & {
  listKey: string;
  receivedAtMs: number;
};

interface NotificationsState {
  notifications: StoredNotification[];
  activeNotificationAnimations: Record<string, number>;
  latestNotificationAnimationCycle: number;
  pushNotification: (
    notification: NotificationWithServers | PartyGatheringNotification,
  ) => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  removeNotificationByNpcId: (npcId: number, world?: string) => void;
  clearNotificationAnimation: (listKey: string, cycle: number) => void;
}

const moveNotificationToFront = (
  notifications: StoredNotification[],
  notification: StoredNotification,
  indexToRemove?: number,
) => {
  if (indexToRemove === undefined) {
    return [notification, ...notifications];
  }

  return [
    notification,
    ...notifications.slice(0, indexToRemove),
    ...notifications.slice(indexToRemove + 1),
  ];
};

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  notifications: [],
  activeNotificationAnimations: {},
  latestNotificationAnimationCycle: 0,
  pushNotification: (
    notification: NotificationWithServers | PartyGatheringNotification,
  ) =>
    set((state) => {
      const notificationAnimationCycle =
        state.latestNotificationAnimationCycle + 1;
      const activeNotificationAnimations: Record<string, number> = {};
      const existingNotificationIndex = state.notifications.findIndex(
        (currentNotification) =>
          currentNotification.notificationId === notification.notificationId,
      );
      const existingNotification =
        existingNotificationIndex >= 0
          ? state.notifications[existingNotificationIndex]
          : undefined;

      if (existingNotification) {
        const uniqueMembers = [
          ...new Set([
            ...existingNotification.servers,
            ...notification.servers,
          ]),
        ];
        const mergedNotification: StoredNotification = {
          ...existingNotification,
          ...notification,
          listKey: existingNotification.listKey,
          receivedAtMs: Date.now(),
          servers: uniqueMembers,
        };

        activeNotificationAnimations[mergedNotification.listKey] =
          notificationAnimationCycle;

        return {
          notifications: moveNotificationToFront(
            state.notifications,
            mergedNotification,
            existingNotificationIndex,
          ),
          activeNotificationAnimations,
          latestNotificationAnimationCycle: notificationAnimationCycle,
        };
      }

      const storedNotification: StoredNotification = {
        ...notification,
        listKey: notification.notificationId,
        receivedAtMs: Date.now(),
      };

      if (
        "type" in storedNotification &&
        storedNotification.type === "party-gathering"
      ) {
        activeNotificationAnimations[storedNotification.listKey] =
          notificationAnimationCycle;
        return {
          notifications: moveNotificationToFront(
            state.notifications,
            storedNotification,
          ),
          activeNotificationAnimations,
          latestNotificationAnimationCycle: notificationAnimationCycle,
        };
      }

      const regularNotification = storedNotification as NotificationWithServers;

      if (regularNotification.message) {
        activeNotificationAnimations[storedNotification.listKey] =
          notificationAnimationCycle;
        return {
          notifications: moveNotificationToFront(
            state.notifications,
            storedNotification,
          ),
          activeNotificationAnimations,
          latestNotificationAnimationCycle: notificationAnimationCycle,
        };
      }

      const existingNpcNotificationIndex = state.notifications.findIndex(
        (n) => {
          if ("type" in n && n.type === "party-gathering") return false;
          const regularN = n as NotificationWithServers;
          return (
            regularN.npc?.id === regularNotification.npc?.id &&
            regularN.world === regularNotification.world
          );
        },
      );
      if (existingNpcNotificationIndex !== -1) {
        const existingNpcNotification =
          state.notifications[existingNpcNotificationIndex];
        const mergedNotification: StoredNotification = {
          ...existingNpcNotification,
          ...storedNotification,
          listKey: existingNpcNotification.listKey,
          receivedAtMs: Date.now(),
          servers: [
            ...new Set([
              ...existingNpcNotification.servers,
              ...storedNotification.servers,
            ]),
          ],
        };

        activeNotificationAnimations[mergedNotification.listKey] =
          notificationAnimationCycle;
        return {
          notifications: moveNotificationToFront(
            state.notifications,
            mergedNotification,
            existingNpcNotificationIndex,
          ),
          activeNotificationAnimations,
          latestNotificationAnimationCycle: notificationAnimationCycle,
        };
      }

      activeNotificationAnimations[storedNotification.listKey] =
        notificationAnimationCycle;

      return {
        notifications: moveNotificationToFront(
          state.notifications,
          storedNotification,
        ),
        activeNotificationAnimations,
        latestNotificationAnimationCycle: notificationAnimationCycle,
      };
    }),
  clearNotifications: () =>
    set(() => ({
      notifications: [],
      activeNotificationAnimations: {},
    })),
  removeNotification: (id: string) =>
    set((state) => {
      const activeNotificationAnimations = {
        ...state.activeNotificationAnimations,
      };
      const notificationToRemove = state.notifications.find(
        (notification) => notification.notificationId === id,
      );

      if (notificationToRemove) {
        delete activeNotificationAnimations[notificationToRemove.listKey];
      }

      return {
        notifications: state.notifications.filter(
          (notification) => notification.notificationId !== id,
        ),
        activeNotificationAnimations,
      };
    }),
  removeNotificationByNpcId: (npcId: number, world?: string) =>
    set((state) => {
      const activeNotificationAnimations = {
        ...state.activeNotificationAnimations,
      };
      const notifications = state.notifications.filter((notification) => {
        if ("type" in notification && notification.type === "party-gathering") {
          return true;
        }

        const regularNotification = notification as NotificationWithServers;
        const shouldRemove =
          regularNotification.npc?.id === npcId &&
          (world ? regularNotification.world === world : true);

        if (shouldRemove) {
          delete activeNotificationAnimations[notification.listKey];
          return false;
        }

        return true;
      });

      return {
        notifications,
        activeNotificationAnimations,
      };
    }),
  clearNotificationAnimation: (listKey, cycle) =>
    set((state) => {
      if (state.activeNotificationAnimations[listKey] !== cycle) {
        return {};
      }

      const activeNotificationAnimations = {
        ...state.activeNotificationAnimations,
      };
      delete activeNotificationAnimations[listKey];

      return { activeNotificationAnimations };
    }),
}));
