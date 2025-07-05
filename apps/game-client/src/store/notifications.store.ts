import { Notification } from "@/features/notifications/hooks/use-notifications";
import { NpcType } from "@/hooks/api/use-npcs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NotificationType =
  | NpcType.HERO
  | NpcType.COLOSSUS
  | NpcType.TITAN
  | NpcType.ELITE2
  | "message";

export interface NotificationSettings {
  show: boolean;
  highlight: boolean;
  ignoreOtherWorlds: boolean;
  guildIds: string[];
}

export type NotificationsSettings = Record<
  NotificationType,
  NotificationSettings
>;

export type NotificationWithServers = Notification & {
  servers: string[];
};

interface NotificationsState {
  notifications: NotificationWithServers[];
  settings: Record<string, NotificationsSettings>;
  setSettings: (characterId: string, settings: NotificationsSettings) => void;
  setState: (settings: Record<string, NotificationsSettings>) => void;
  pushNotification: (notification: NotificationWithServers) => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

export const recommendedSettings: NotificationsSettings = {
  [NpcType.ELITE2]: {
    show: false,
    highlight: false,
    ignoreOtherWorlds: false,
    guildIds: [],
  },
  [NpcType.HERO]: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    guildIds: [],
  },
  [NpcType.COLOSSUS]: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    guildIds: [],
  },
  [NpcType.TITAN]: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    guildIds: [],
  },
  message: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    guildIds: [],
  },
};

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: [],
      settings: {},
      setState: (settings: Record<string, NotificationsSettings>) =>
        set(() => ({ settings })),
      setSettings: (characterId: string, settings: NotificationsSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [characterId]: settings,
          },
        })),
      pushNotification: (notification: NotificationWithServers) =>
        set((state) => {
          // If notification already exists, push members to it
          const existingNotification = state.notifications.find(
            (n) => n.notificationId === notification.notificationId
          );

          if (existingNotification) {
            // Merge members, ensuring no duplicates
            const uniqueMembers = [
              ...new Set([
                ...existingNotification.servers,
                ...notification.servers,
              ]),
            ];
            existingNotification.servers = uniqueMembers;
            return { notifications: [...state.notifications] };
          }

          if (notification.message) {
            return {
              notifications: [notification, ...state.notifications],
            };
          }

          // If the notification npc is already present, overwrite it and push to the front
          const existingNotificationIndex = state.notifications.findIndex(
            (n) =>
              n.npc?.id === notification.npc?.id &&
              n.world === notification.world
          );
          if (existingNotificationIndex !== -1) {
            state.notifications[existingNotificationIndex] = notification;
            return {
              notifications: [
                ...state.notifications.slice(0, existingNotificationIndex),
                ...state.notifications.slice(existingNotificationIndex + 1),
                notification,
              ],
            };
          }

          return {
            notifications: [notification, ...state.notifications],
          };
        }),
      clearNotifications: () => set(() => ({ notifications: [] })),
      removeNotification: (id: string) =>
        set((state) => ({
          notifications: state.notifications.filter(
            (notification) => notification.notificationId !== id
          ),
        })),
    }),
    {
      name: "ll-notifications-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        notifications: state.notifications,
      }),
      version: 2,
    }
  )
);
