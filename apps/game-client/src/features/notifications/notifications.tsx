import { DraggableWindow } from "@/components/draggable-window";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import {
  Notification,
  useNotifications,
} from "@/features/notifications/hooks/use-notifications";
import { useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { AnimatePresence, motion } from "framer-motion";

export const Notifications = () => {
  useNotifications();
  const { setOpen } = useWindowsStore();
  const {
    notifications,
    clearNotifications,
    settings: notificationsSettings,
  } = useNotificationsStore();
  const { characterId, world } = useGlobalStore((s) => s.gameState);

  const handleClose = () => {
    setOpen("notifications", false);
    clearNotifications();
  };

  const getKey = (notification: Notification) => {
    if (!notification.npc || !notification.npc.wt) return "message";
    return getNpcTypeByWt(notification.npc.wt);
  };

  const isNotificationVisible = (notification: Notification) => {
    const key = getKey(
      notification
    ) as keyof (typeof notificationsSettings)[string];

    const charSettings = notificationsSettings[characterId!];
    if (!charSettings) return false;

    const settings = charSettings[key];
    if (!settings) return false;

    if (settings.ignoreOtherWorlds && notification.world !== world) {
      return false;
    }

    return settings.show && settings.guildIds.includes(notification.guildId);
  };

  const filteredNotifications = notifications.filter(isNotificationVisible);

  if (filteredNotifications.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="notifications"
        initial={{ opacity: 0, scaleY: 1.01 }}
        animate={{ opacity: 1, scaleY: 1 }}
        exit={{ opacity: 0, scaleY: 1.01 }}
        transition={{ duration: 0.1 }}
      >
        <DraggableWindow
          id="notifications"
          title="Powiadomienia"
          onClose={handleClose}
          resizable={false}
          minHeight={200}
          maxHeight={400}
          minWidth={360}
          dynamicHeight
        >
          <div className="ll-flex ll-flex-col ll-h-full ll-w-full">
            <NotificationsList notifications={filteredNotifications} />
          </div>
        </DraggableWindow>
      </motion.div>
    </AnimatePresence>
  );
};
