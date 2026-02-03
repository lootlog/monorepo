import type { Notification } from "@/features/notifications/hooks/use-notifications";
import { NpcType } from "@/hooks/api/use-npcs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NotificationType =
  | NpcType.HERO
  | NpcType.COLOSSUS
  | NpcType.TITAN
  | NpcType.ELITE2
  | "message"
  | "party-gathering";

export interface NotificationSettings {
  show: boolean;
  highlight: boolean;
  ignoreOtherWorlds: boolean;
  autoHideTimeout?: number;
  guildIds: string[];
  sound: boolean;
}

export type NotificationsSettings = Record<
  NotificationType,
  NotificationSettings
>;

export type NotificationWithServers = Notification & {
  servers: string[];
};

export type PartyGatheringCharacter = {
  nick: string;
  lvl: number;
  prof: string;
  characterId: string;
  accountId: string;
  icon: string;
};

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

interface NotificationsState {
  notifications: (NotificationWithServers | PartyGatheringNotification)[];
  settings: Record<string, NotificationsSettings>;
  setSettings: (characterId: string, settings: NotificationsSettings) => void;
  setState: (settings: Record<string, NotificationsSettings>) => void;
  pushNotification: (notification: NotificationWithServers | PartyGatheringNotification) => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  removeNotificationByNpcId: (npcId: number, world?: string) => void;
}

export const recommendedSettings: NotificationsSettings = {
  [NpcType.ELITE2]: {
    show: false,
    highlight: false,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  [NpcType.HERO]: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  [NpcType.COLOSSUS]: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  [NpcType.TITAN]: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  message: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  "party-gathering": {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
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
      pushNotification: (notification: NotificationWithServers | PartyGatheringNotification) =>
        set((state) => {
          // If notification already exists, push members to it
          const existingNotification = state.notifications.find(
            (n) => n.notificationId === notification.notificationId,
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

          // Handle party-gathering notifications
          if ("type" in notification && notification.type === "party-gathering") {
            return {
              notifications: [notification, ...state.notifications],
            };
          }

          const regularNotification = notification as NotificationWithServers;

          if (regularNotification.message) {
            return {
              notifications: [notification, ...state.notifications],
            };
          }

          // If the notification npc is already present, overwrite it and push to the front
          const existingNotificationIndex = state.notifications.findIndex(
            (n) => {
              if ("type" in n && n.type === "party-gathering") return false;
              const regularN = n as NotificationWithServers;
              return regularN.npc?.id === regularNotification.npc?.id &&
                regularN.world === regularNotification.world;
            }
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
            (notification) => notification.notificationId !== id,
          ),
        })),
      removeNotificationByNpcId: (npcId: number, world?: string) =>
        set((state) => ({
          notifications: state.notifications.filter(
            (notification) => {
              if ("type" in notification && notification.type === "party-gathering") return true;
              const regularNotification = notification as NotificationWithServers;
              return !(
                regularNotification.npc?.id === npcId &&
                (world ? regularNotification.world === world : true)
              );
            }
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
    },
  ),
);
