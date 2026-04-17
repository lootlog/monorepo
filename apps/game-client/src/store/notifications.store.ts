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

type NotificationAutoHideState = {
  deadlineMs: number | null;
  pausedRemainingMs: number | null;
  durationMs: number;
};

interface NotificationsState {
  notifications: StoredNotification[];
  notificationAutoHideByListKey: Record<string, NotificationAutoHideState>;
  latestNotificationAnimationCycle: number;
  pushNotification: (
    notification: NotificationWithServers | PartyGatheringNotification,
  ) => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  removeNotificationByNpcId: (npcId: number, world?: string) => void;
  setNotificationAutoHide: (listKey: string, durationMs: number) => void;
  pauseNotificationAutoHide: (listKey: string) => void;
  resumeNotificationAutoHide: (listKey: string) => void;
  clearNotificationAutoHide: (listKey: string) => void;
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
  notificationAutoHideByListKey: {},
  latestNotificationAnimationCycle: 0,
  pushNotification: (
    notification: NotificationWithServers | PartyGatheringNotification,
  ) =>
    set((state) => {
      const notificationAnimationCycle =
        state.latestNotificationAnimationCycle + 1;
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

        return {
          notifications: moveNotificationToFront(
            state.notifications,
            mergedNotification,
            existingNotificationIndex,
          ),
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
        return {
          notifications: moveNotificationToFront(
            state.notifications,
            storedNotification,
          ),
          latestNotificationAnimationCycle: notificationAnimationCycle,
        };
      }

      const regularNotification = storedNotification as NotificationWithServers;

      if (regularNotification.message) {
        return {
          notifications: moveNotificationToFront(
            state.notifications,
            storedNotification,
          ),
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
        return {
          notifications: moveNotificationToFront(
            state.notifications,
            mergedNotification,
            existingNpcNotificationIndex,
          ),
          latestNotificationAnimationCycle: notificationAnimationCycle,
        };
      }

      return {
        notifications: moveNotificationToFront(
          state.notifications,
          storedNotification,
        ),
        latestNotificationAnimationCycle: notificationAnimationCycle,
      };
    }),
  clearNotifications: () =>
    set(() => ({
      notifications: [],
      notificationAutoHideByListKey: {},
    })),
  removeNotification: (id: string) =>
    set((state) => {
      const notificationAutoHideByListKey = {
        ...state.notificationAutoHideByListKey,
      };
      const notificationToRemove = state.notifications.find(
        (notification) => notification.notificationId === id,
      );

      if (notificationToRemove) {
        delete notificationAutoHideByListKey[notificationToRemove.listKey];
      }

      return {
        notifications: state.notifications.filter(
          (notification) => notification.notificationId !== id,
        ),
        notificationAutoHideByListKey,
      };
    }),
  removeNotificationByNpcId: (npcId: number, world?: string) =>
    set((state) => {
      const notificationAutoHideByListKey = {
        ...state.notificationAutoHideByListKey,
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
          delete notificationAutoHideByListKey[notification.listKey];
          return false;
        }

        return true;
      });

      return {
        notifications,
        notificationAutoHideByListKey,
      };
    }),
  setNotificationAutoHide: (listKey, durationMs) =>
    set((state) => {
      const notificationAutoHideByListKey = {
        ...state.notificationAutoHideByListKey,
      };

      if (durationMs <= 0) {
        delete notificationAutoHideByListKey[listKey];
        return { notificationAutoHideByListKey };
      }

      notificationAutoHideByListKey[listKey] = {
        deadlineMs: Date.now() + durationMs,
        pausedRemainingMs: null,
        durationMs,
      };

      return { notificationAutoHideByListKey };
    }),
  pauseNotificationAutoHide: (listKey) =>
    set((state) => {
      const currentState = state.notificationAutoHideByListKey[listKey];

      if (!currentState || currentState.deadlineMs === null) {
        return {};
      }

      return {
        notificationAutoHideByListKey: {
          ...state.notificationAutoHideByListKey,
          [listKey]: {
            ...currentState,
            deadlineMs: null,
            pausedRemainingMs: Math.max(
              0,
              currentState.deadlineMs - Date.now(),
            ),
          },
        },
      };
    }),
  resumeNotificationAutoHide: (listKey) =>
    set((state) => {
      const currentState = state.notificationAutoHideByListKey[listKey];

      if (!currentState || currentState.pausedRemainingMs === null) {
        return {};
      }

      return {
        notificationAutoHideByListKey: {
          ...state.notificationAutoHideByListKey,
          [listKey]: {
            ...currentState,
            deadlineMs: Date.now() + currentState.pausedRemainingMs,
            pausedRemainingMs: null,
          },
        },
      };
    }),
  clearNotificationAutoHide: (listKey) =>
    set((state) => {
      if (!(listKey in state.notificationAutoHideByListKey)) {
        return {};
      }

      const notificationAutoHideByListKey = {
        ...state.notificationAutoHideByListKey,
      };
      delete notificationAutoHideByListKey[listKey];

      return { notificationAutoHideByListKey };
    }),
}));
