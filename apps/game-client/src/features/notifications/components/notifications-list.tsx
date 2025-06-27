import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleNotification } from "@/features/notifications/components/single-notification";
import { NotificationWithServers } from "@/store/notifications.store";
import { FC } from "react";

export type NotificationsListProps = {
  notifications?: NotificationWithServers[];
};

export const NotificationsList: FC<NotificationsListProps> = ({
  notifications,
}) => {
  return (
    <ScrollArea
      className="ll-p-0 ll-flex ll-flex-col ll-gap-4 ll-w-full ll-box-border ll-mt-1 ll-pl-0 ll-max-h-64"
      type="auto"
    >
      {notifications?.map((notification, i) => {
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
