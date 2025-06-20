import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleNotification } from "@/features/notifications/components/single-notification";
import { useNotificationsStore } from "@/store/notifications.store";
import { FC } from "react";

export const NotificationsList: FC = () => {
  const { notifications } = useNotificationsStore();

  return (
    <ScrollArea
      className="ll-p-2 ll-flex ll-flex-col ll-gap-4 ll-w-full ll-box-border ll-mt-1"
      type="auto"
    >
      {notifications.map((notification, i) => {
        return (
          <SingleNotification
            key={notification.notificationId}
            notification={notification}
            index={i}
          />
        );
      })}
    </ScrollArea>
  );
};
