import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useVisibleNotifications } from "@/features/notifications/hooks/use-visible-notifications";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";

export const Notifications = () => {
  useNotifications();
  const open = useWindowsStore((state) => state.notifications.open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { clearNotifications } = useNotificationsStore();
  const { notifications: filteredNotifications } = useVisibleNotifications({
    autoCleanup: true,
    tickMs: 100,
  });

  const handleClose = () => {
    setOpen("notifications", false);
    clearNotifications();
  };

  return (
    <AnimatedWindow
      isOpen={open && filteredNotifications.length > 0}
      windowKey="notifications"
    >
      <DraggableWindow
        id="notifications"
        title="Powiadomienia"
        onClose={handleClose}
        resizable
        minHeight={88}
        maxHeight={600}
        minWidth={242}
      >
        <div className="ll:flex ll:h-full ll:w-full ll:flex-col ll:overflow-hidden">
          <NotificationsList notifications={filteredNotifications} />
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
