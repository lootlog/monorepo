import { DraggableWindow } from "@/components/draggable-window";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { AnimatePresence, motion } from "framer-motion";

export const Notifications = () => {
  const { setOpen } = useWindowsStore();
  const { notifications, clearNotifications } = useNotificationsStore();
  useNotifications();

  const handleClose = () => {
    setOpen("notifications", false);
    clearNotifications();
  };

  return (
    <AnimatePresence>
      {notifications.length > 0 && (
        <motion.div
          key="npc-detector"
          initial={{ opacity: 0, scaleY: 1.01 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          <DraggableWindow
            id="notifications"
            title="Powiadomienia"
            onClose={handleClose}
            minWidth={300}
            minHeight={100}
            resizable={true}
          >
            <div className="ll-flex ll-flex-col ll-h-full ll-w-full">
              <NotificationsList />
            </div>
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
