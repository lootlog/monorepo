import { Notification } from "@/features/notifications/hooks/use-notifications";
import { create } from "zustand";

interface NotificationsState {
  notifications: Notification[];
  pushNotification: (notification: Notification) => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
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
}));
