import { Notification } from "@/features/notifications/hooks/use-notifications";
import { NpcType } from "@/hooks/api/use-npcs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type PickedNpcType =
  | NpcType.HERO
  | NpcType.COLOSSUS
  | NpcType.TITAN
  | NpcType.ELITE2;

export interface NotificationsSettingByNpc {
  show: boolean;
  highlight: boolean;
  ignoreOtherWorlds: boolean;
  guildIds: string[];
}

export type NotificationsSettings = Pick<
  Record<NpcType, NotificationsSettingByNpc>,
  PickedNpcType
>;

interface NotificationsState {
  notifications: Notification[];
  settings: Record<string, NotificationsSettings>;
  setSettings: (characterId: string, settings: NotificationsSettings) => void;
  setState: (settings: Record<string, NotificationsSettings>) => void;
  pushNotification: (notification: Notification) => void;
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
      pushNotification: (notification: Notification) =>
        set((state) => {
          if (
            state.notifications.some(
              (n) => n.notificationId === notification.notificationId
            )
          ) {
            return state;
          }
          return {
            notifications: [...state.notifications, notification],
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
      }),
    }
  )
);
