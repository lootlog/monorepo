import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useVisibleNotifications } from "@/features/notifications/hooks/use-visible-notifications";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";

export const Notifications = () => {
  useNotifications();
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { clearNotifications } = useNotificationsStore();
  const { notifications: filteredNotifications, now } = useVisibleNotifications(
    {
      autoCleanup: true,
    },
  );

  const handleClose = () => {
    setOpen("notifications", false);
    clearNotifications();
  };

  if (filteredNotifications.length === 0) return null;

  return (
    <AnimatedWindow isOpen={true} windowKey="notifications">
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
        <div className="ll:flex ll:flex-col ll:h-full ll:w-full">
          <NotificationsList notifications={filteredNotifications} now={now} />
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
