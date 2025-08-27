import { DraggableWindow } from "@/components/draggable-window";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useVisibleNotifications } from "@/features/notifications/hooks/use-visible-notifications";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { AnimatePresence, motion } from "framer-motion";

export const Notifications = () => {
  useNotifications();
  const { setOpen } = useWindowsStore();
  const { clearNotifications } = useNotificationsStore();
  const { notifications: filteredNotifications, now } = useVisibleNotifications(
    {
      autoCleanup: true,
    }
  );

  const handleClose = () => {
    setOpen("notifications", false);
    clearNotifications();
  };

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
            <NotificationsList
              notifications={filteredNotifications}
              now={now}
            />
          </div>
        </DraggableWindow>
      </motion.div>
    </AnimatePresence>
  );
};
