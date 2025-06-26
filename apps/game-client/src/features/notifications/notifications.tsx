import { DraggableWindow } from "@/components/draggable-window";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useGlobalStore } from "@/store/global.store";
import {
  PickedNpcType,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { AnimatePresence, motion } from "framer-motion";

export const Notifications = () => {
  useNotifications();
  const { setOpen } = useWindowsStore();
  const { notifications, clearNotifications, settings } =
    useNotificationsStore();

  const { characterId } = useGlobalStore((s) => s.gameState);

  const handleClose = () => {
    setOpen("notifications", false);
    clearNotifications();
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (!notification.npc || !notification.npc.wt) return false;

    const npcType = getNpcTypeByWt(notification.npc?.wt);
    const settingsByNpcType = settings[characterId!][npcType as PickedNpcType];

    return (
      settingsByNpcType.show &&
      settingsByNpcType.guildIds.includes(notification.guildId)
    );
  });

  return (
    <AnimatePresence>
      {filteredNotifications.length > 0 && (
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
              <NotificationsList notifications={notifications} />
            </div>
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
